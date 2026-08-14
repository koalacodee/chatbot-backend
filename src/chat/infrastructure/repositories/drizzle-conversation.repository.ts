import { Injectable } from '@nestjs/common';
import { asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { Conversation } from 'src/chat/domain/entities/conversation.entity';
import { Message } from 'src/chat/domain/entities/message.entity';
import { ConversationRepository } from 'src/chat/domain/repositories/conversation.repository';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { conversations, guests, messages } from 'src/common/drizzle/schema';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

type ConversationRow = typeof conversations.$inferSelect;
type GuestRow = typeof guests.$inferSelect;
type MessageRow = typeof messages.$inferSelect;

@Injectable()
export class DrizzleConversationRepository extends ConversationRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  /**
   * `ConversationOptions.id` is a UUID value object, not a string. The Prisma mapper
   * passed the raw string straight through, so `_id` ended up holding a string and
   * every `conversation.id.value` read back `undefined` — including the one in
   * `toJSON()`. Wrapping it here is what makes the id survive a round trip.
   */
  private toDomain(
    row: ConversationRow,
    guest: Guest | undefined,
    messageRows: MessageRow[],
  ): Conversation {
    return Conversation.create({
      id: UUID.create(row.id),
      guest,
      anonymousId: row.anonymousId ?? undefined,
      startedAt: new Date(row.startedAt),
      updatedAt: new Date(row.updatedAt),
      endedAt: row.endedAt ? new Date(row.endedAt) : undefined,
      messages: messageRows.map((message) => this.toMessage(message)),
    });
  }

  private toMessage(row: MessageRow): Message {
    return Message.create({
      id: row.id,
      conversationId: row.conversationId,
      content: row.content,
      role: row.role,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  private toGuest(row: GuestRow | null): Guest | undefined {
    if (!row) return undefined;

    return Guest.create({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  private messagesFor(
    conversationId: string,
    direction: 'asc' | 'desc',
  ): Promise<MessageRow[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(
        direction === 'asc'
          ? asc(messages.createdAt)
          : desc(messages.createdAt),
      );
  }

  async save(conversation: Conversation): Promise<Conversation> {
    // updated_at is `@updatedAt` in the Prisma schema and NOT NULL without a default in
    // Postgres, so Drizzle has to stamp it explicitly on every write.
    const updatedAt = new Date().toISOString();

    const values = {
      id: conversation.id.value,
      guestId: conversation.guest?.id.value ?? null,
      startedAt: conversation.startedAt.toISOString(),
      updatedAt,
      endedAt: conversation.endedAt?.toISOString() ?? null,
    };

    const [saved] = await this.db
      .insert(conversations)
      .values(values)
      .onConflictDoUpdate({
        target: conversations.id,
        set: {
          guestId: values.guestId,
          startedAt: values.startedAt,
          updatedAt: values.updatedAt,
          endedAt: values.endedAt,
        },
      })
      .returning();

    const messageRows = await this.messagesFor(saved.id, 'desc');

    // The caller already handed us the guest, so reuse it rather than re-reading it.
    return this.toDomain(saved, conversation.guest, messageRows);
  }

  async findById(id: string): Promise<Conversation | null> {
    const [rows, messageRows] = await Promise.all([
      this.db
        .select({ conversation: conversations, guest: guests })
        .from(conversations)
        .leftJoin(guests, eq(guests.id, conversations.guestId))
        .where(eq(conversations.id, id))
        .limit(1),
      this.messagesFor(id, 'asc'),
    ]);

    if (!rows[0]) return null;

    return this.toDomain(
      rows[0].conversation,
      this.toGuest(rows[0].guest),
      messageRows,
    );
  }

  async findAll(): Promise<Conversation[]> {
    const rows = await this.db
      .select({ conversation: conversations, guest: guests })
      .from(conversations)
      .leftJoin(guests, eq(guests.id, conversations.guestId));

    return rows.map((row) =>
      this.toDomain(row.conversation, this.toGuest(row.guest), []),
    );
  }

  async removeById(id: string): Promise<Conversation | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.delete(conversations).where(eq(conversations.id, id));

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(conversations);

    return Number(rows[0].value);
  }

  async findByUser(userId?: string): Promise<Conversation[] | null> {
    const rows = await this.db
      .select({ conversation: conversations, guest: guests })
      .from(conversations)
      .leftJoin(guests, eq(guests.id, conversations.guestId))
      .where(
        userId
          ? eq(conversations.guestId, userId)
          : // Prisma's `{ guest: { id: undefined } }` collapsed to "has a guest at all".
            isNotNull(conversations.guestId),
      )
      .orderBy(desc(conversations.updatedAt));

    if (rows.length === 0) return [];

    // One batched read for every conversation's messages, grouped in memory, instead of
    // letting the ORM fan out a lookup per conversation.
    const messageRows = await this.db
      .select()
      .from(messages)
      .where(
        inArray(
          messages.conversationId,
          rows.map((row) => row.conversation.id),
        ),
      )
      .orderBy(desc(messages.createdAt));

    const byConversation = new Map<string, MessageRow[]>();

    for (const message of messageRows) {
      const bucket = byConversation.get(message.conversationId) ?? [];
      bucket.push(message);
      byConversation.set(message.conversationId, bucket);
    }

    return rows.map((row) =>
      this.toDomain(
        row.conversation,
        this.toGuest(row.guest),
        byConversation.get(row.conversation.id) ?? [],
      ),
    );
  }
}

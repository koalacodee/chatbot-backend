import { Injectable } from '@nestjs/common';
import { asc, count, eq, sql } from 'drizzle-orm';
import { Message } from 'src/chat/domain/entities/message.entity';
import { MessageRepository } from 'src/chat/domain/repositories/message.repository';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { messages } from 'src/common/drizzle/schema';

type MessageRow = typeof messages.$inferSelect;

@Injectable()
export class DrizzleMessageRepository extends MessageRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(row: MessageRow): Message {
    return Message.create({
      id: row.id,
      conversationId: row.conversationId,
      content: row.content,
      role: row.role,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  // updated_at is `@updatedAt` in Prisma and NOT NULL without a Postgres default, so it
  // has to be stamped here on every write.
  private toRow(message: Message): typeof messages.$inferInsert {
    return {
      id: message.id.value,
      content: message.content,
      role: message.role,
      conversationId: message.conversationId.value,
      createdAt: message.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async createMany(messagesToCreate: Message[]): Promise<Message[]> {
    if (messagesToCreate.length === 0) return [];

    await this.db
      .insert(messages)
      .values(messagesToCreate.map((message) => this.toRow(message)))
      // Prisma's `skipDuplicates: true`.
      .onConflictDoNothing();

    return messagesToCreate;
  }

  async save(message: Message): Promise<Message> {
    const row = this.toRow(message);
    const { id: _id, ...updatable } = row;

    const [saved] = await this.db
      .insert(messages)
      .values(row)
      .onConflictDoUpdate({ target: messages.id, set: updatable })
      .returning();

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Message | null> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAll(): Promise<Message[]> {
    const rows = await this.db.select().from(messages);

    return rows.map((row) => this.toDomain(row));
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return rows.map((row) => this.toDomain(row));
  }

  async removeById(id: string): Promise<Message | null> {
    const deleted = await this.db
      .delete(messages)
      .where(eq(messages.id, id))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(messages);

    return Number(rows[0].value);
  }
}

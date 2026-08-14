import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { attachments } from 'src/common/drizzle/schema';
import { Attachment } from '../../domain/entities/attachment.entity';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';

type AttachmentRow = typeof attachments.$inferSelect;

@Injectable()
export class DrizzleAttachmentRepository extends AttachmentRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(row: AttachmentRow): Attachment {
    return Attachment.create({
      id: row.id,
      type: row.type,
      filename: row.filename,
      originalName: row.originalName,
      expirationDate: row.expirationDate
        ? new Date(row.expirationDate)
        : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      targetId: row.targetId ?? undefined,
      userId: row.userId ?? undefined,
      guestId: row.guestId ?? undefined,
      isGlobal: row.isGlobal,
      size: row.size,
      cloned: row.cloned,
    });
  }

  /** Everything but `save` scopes to originals; clones are bookkeeping rows. */
  private notCloned = eq(attachments.cloned, false);

  async save(attachment: Attachment): Promise<Attachment> {
    const values = {
      id: attachment.id,
      type: attachment.type,
      filename: attachment.filename,
      originalName: attachment.originalName,
      expirationDate: attachment.expirationDate?.toISOString() ?? null,
      targetId: attachment.targetId,
      userId: attachment.userId,
      guestId: attachment.guestId,
      isGlobal: attachment.isGlobal,
      size: attachment.size,
      cloned: attachment.cloned,
      createdAt: attachment.createdAt.toISOString(),
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt: new Date().toISOString(),
    };

    const { id: _id, createdAt: _createdAt, ...updatable } = values;

    const [saved] = await this.db
      .insert(attachments)
      .values(values)
      .onConflictDoUpdate({ target: attachments.id, set: updatable })
      .returning();

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Attachment | null> {
    const rows = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findByIds(ids: string[]): Promise<Attachment[]> {
    if (ids.length === 0) return [];

    const rows = await this.db
      .select()
      .from(attachments)
      .where(inArray(attachments.id, ids));

    return rows.map((row) => this.toDomain(row));
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async findByTargetId(targetId: string): Promise<Attachment[]> {
    const rows = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.targetId, targetId));

    return rows.map((row) => this.toDomain(row));
  }

  async countByTargetId(targetId: string): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(attachments)
      .where(eq(attachments.targetId, targetId));

    return Number(rows[0].value);
  }

  async removeByTargetId(targetId: string): Promise<Attachment[]> {
    // One statement rather than the old findMany-then-deleteMany pair, which left a
    // window where the returned rows were not the rows actually deleted.
    const deleted = await this.db
      .delete(attachments)
      .where(eq(attachments.targetId, targetId))
      .returning();

    return deleted.map((row) => this.toDomain(row));
  }

  async removeById(id: string): Promise<Attachment | null> {
    const deleted = await this.db
      .delete(attachments)
      .where(eq(attachments.id, id))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Attachment[]> {
    const rows = await this.db
      .select()
      .from(attachments)
      .where(and(eq(attachments.userId, userId), this.notCloned))
      .orderBy(desc(attachments.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => this.toDomain(row));
  }

  async countByUserId(userId: string): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(attachments)
      .where(and(eq(attachments.userId, userId), this.notCloned));

    return Number(rows[0].value);
  }

  async findGlobalAttachments(limit = 50, offset = 0): Promise<Attachment[]> {
    const rows = await this.db
      .select()
      .from(attachments)
      .where(and(eq(attachments.isGlobal, true), this.notCloned))
      .orderBy(desc(attachments.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => this.toDomain(row));
  }

  async countGlobalAttachments(): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(attachments)
      .where(and(eq(attachments.isGlobal, true), this.notCloned));

    return Number(rows[0].value);
  }

  private userOrGlobal(userId: string) {
    return and(
      or(eq(attachments.userId, userId), eq(attachments.isGlobal, true)),
      this.notCloned,
    );
  }

  async findUserAndGlobalAttachments(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Attachment[]> {
    // Selects the whole row. The Prisma version projected a subset that left out
    // filename, createdAt, updatedAt, userId and guestId, so every entity it returned had
    // an undefined filename — unusable for building a download path — and a createdAt
    // defaulted to "now" by the constructor.
    const rows = await this.db
      .select()
      .from(attachments)
      .where(this.userOrGlobal(userId))
      .orderBy(desc(attachments.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => this.toDomain(row));
  }

  async countUserAndGlobalAttachments(userId: string): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(attachments)
      .where(this.userOrGlobal(userId));

    return Number(rows[0].value);
  }

  async update(
    id: string,
    update: Partial<
      Pick<
        Attachment,
        | 'type'
        | 'filename'
        | 'originalName'
        | 'expirationDate'
        | 'targetId'
        | 'userId'
        | 'guestId'
        | 'isGlobal'
      >
    >,
  ): Promise<Attachment> {
    const set: Partial<typeof attachments.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (update.type !== undefined) set.type = update.type;
    if (update.filename !== undefined) set.filename = update.filename;
    if (update.originalName !== undefined)
      set.originalName = update.originalName;
    if (update.expirationDate !== undefined)
      set.expirationDate = update.expirationDate?.toISOString() ?? null;
    if (update.targetId !== undefined) set.targetId = update.targetId;
    if (update.userId !== undefined) set.userId = update.userId;
    if (update.guestId !== undefined) set.guestId = update.guestId;
    if (update.isGlobal !== undefined) set.isGlobal = update.isGlobal;

    const [updated] = await this.db
      .update(attachments)
      .set(set)
      .where(eq(attachments.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Attachment not found');

    return this.toDomain(updated);
  }
}

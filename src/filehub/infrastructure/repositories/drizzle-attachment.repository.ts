import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { Attachment } from '../../domain/entities/attachment.entity';
import { attachments } from 'src/common/drizzle/schema';
import { eq, or, inArray, count, desc } from 'drizzle-orm';

@Injectable()
export class DrizzleAttachmentRepository extends AttachmentRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private toISOStringSafe(
    date: Date | string | undefined | null,
  ): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return null;
  }

  private toDomain(record: any): Attachment {
    return Attachment.create({
      id: record.id,
      type: record.type,
      filename: record.filename,
      originalName: record.originalName,
      expirationDate: record.expirationDate
        ? new Date(record.expirationDate)
        : undefined,
      createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
      targetId: record.targetId ?? undefined,
      userId: record.userId ?? undefined,
      guestId: record.guestId ?? undefined,
      isGlobal: record.isGlobal ?? false,
      size: record.size ?? 0,
      cloned: record.cloned ?? false,
    });
  }

  async save(attachment: Attachment): Promise<Attachment> {
    const data = {
      id: attachment.id,
      type: attachment.type,
      filename: attachment.filename,
      originalName: attachment.originalName,
      expirationDate: this.toISOStringSafe(attachment.expirationDate),
      createdAt:
        attachment.createdAt instanceof Date
          ? attachment.createdAt.toISOString()
          : (attachment.createdAt ?? new Date().toISOString()),
      updatedAt:
        attachment.updatedAt instanceof Date
          ? attachment.updatedAt.toISOString()
          : (attachment.updatedAt ?? new Date().toISOString()),
      targetId: attachment.targetId ?? null,
      userId: attachment.userId ?? null,
      guestId: attachment.guestId ?? null,
      isGlobal: attachment.isGlobal,
      size: attachment.size,
      cloned: attachment.cloned,
    };

    await this.db
      .insert(attachments)
      .values(data)
      .onConflictDoUpdate({
        target: attachments.id,
        set: {
          type: data.type,
          filename: data.filename,
          originalName: data.originalName,
          expirationDate: data.expirationDate,
          updatedAt: new Date().toISOString(),
          targetId: data.targetId,
        },
      });

    return this.findById(attachment.id);
  }

  async findById(id: string): Promise<Attachment | null> {
    const record = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);

    if (record.length === 0) {
      return null;
    }

    return this.toDomain(record[0]);
  }

  async findByIds(ids: string[]): Promise<Attachment[]> {
    if (ids.length === 0) {
      return [];
    }

    const records = await this.db
      .select()
      .from(attachments)
      .where(inArray(attachments.id, ids));

    return records.map((record) => this.toDomain(record));
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ count: count().as('count') })
      .from(attachments)
      .where(eq(attachments.id, id));

    return Number(result[0]?.count || 0) > 0;
  }

  async findByTargetId(targetId: string): Promise<Attachment[]> {
    const records = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.targetId, targetId))
      .orderBy(desc(attachments.createdAt));

    return records.map((record) => this.toDomain(record));
  }

  async countByTargetId(targetId: string): Promise<number> {
    const result = await this.db
      .select({ count: count().as('count') })
      .from(attachments)
      .where(eq(attachments.targetId, targetId));

    return Number(result[0]?.count || 0);
  }

  async removeByTargetId(targetId: string): Promise<Attachment[]> {
    const attachmentsToRemove = await this.findByTargetId(targetId);

    if (attachmentsToRemove.length === 0) {
      return [];
    }

    await this.db.delete(attachments).where(eq(attachments.targetId, targetId));

    return attachmentsToRemove;
  }

  async findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Attachment[]> {
    const baseQuery = this.db
      .select()
      .from(attachments)
      .where(eq(attachments.userId, userId))
      .orderBy(desc(attachments.createdAt));

    const records =
      limit !== undefined && offset !== undefined
        ? await baseQuery.limit(limit).offset(offset)
        : limit !== undefined
          ? await baseQuery.limit(limit)
          : offset !== undefined
            ? await baseQuery.offset(offset)
            : await baseQuery;

    return records.map((record) => this.toDomain(record));
  }

  async countByUserId(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count().as('count') })
      .from(attachments)
      .where(eq(attachments.userId, userId));

    return Number(result[0]?.count || 0);
  }

  async findGlobalAttachments(
    limit?: number,
    offset?: number,
  ): Promise<Attachment[]> {
    const baseQuery = this.db
      .select()
      .from(attachments)
      .where(eq(attachments.isGlobal, true))
      .orderBy(desc(attachments.createdAt));

    const records =
      limit !== undefined && offset !== undefined
        ? await baseQuery.limit(limit).offset(offset)
        : limit !== undefined
          ? await baseQuery.limit(limit)
          : offset !== undefined
            ? await baseQuery.offset(offset)
            : await baseQuery;

    return records.map((record) => this.toDomain(record));
  }

  async countGlobalAttachments(): Promise<number> {
    const result = await this.db
      .select({ count: count().as('count') })
      .from(attachments)
      .where(eq(attachments.isGlobal, true));

    return Number(result[0]?.count || 0);
  }

  async findUserAndGlobalAttachments(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Attachment[]> {
    const baseQuery = this.db
      .select()
      .from(attachments)
      .where(or(eq(attachments.userId, userId), eq(attachments.isGlobal, true)))
      .orderBy(desc(attachments.createdAt));

    const records =
      limit !== undefined && offset !== undefined
        ? await baseQuery.limit(limit).offset(offset)
        : limit !== undefined
          ? await baseQuery.limit(limit)
          : offset !== undefined
            ? await baseQuery.offset(offset)
            : await baseQuery;

    return records.map((record) => this.toDomain(record));
  }

  async countUserAndGlobalAttachments(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count().as('count') })
      .from(attachments)
      .where(
        or(eq(attachments.userId, userId), eq(attachments.isGlobal, true)),
      );

    return Number(result[0]?.count || 0);
  }

  async removeById(id: string): Promise<Attachment | null> {
    const attachment = await this.findById(id);
    if (!attachment) {
      return null;
    }

    await this.db.delete(attachments).where(eq(attachments.id, id));

    return attachment;
  }

  async update(
    id: string,
    update: Partial<
      Pick<
        Attachment,
        'type' | 'filename' | 'originalName' | 'expirationDate' | 'targetId'
      >
    >,
  ): Promise<Attachment> {
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (update.type !== undefined) {
      updateData.type = update.type;
    }

    if (update.filename !== undefined) {
      updateData.filename = update.filename;
    }

    if (update.originalName !== undefined) {
      updateData.originalName = update.originalName;
    }

    if (update.expirationDate !== undefined) {
      updateData.expirationDate = this.toISOStringSafe(update.expirationDate);
    }

    if (update.targetId !== undefined) {
      updateData.targetId = update.targetId ?? null;
    }

    await this.db
      .update(attachments)
      .set(updateData)
      .where(eq(attachments.id, id));

    return this.findById(id);
  }
}

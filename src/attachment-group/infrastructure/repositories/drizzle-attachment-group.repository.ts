import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';
import {
  attachmentGroups,
  attachmentToAttachmentGroup,
} from 'src/common/drizzle/schema';
import { eq, and, desc, sql, count, inArray } from 'drizzle-orm';

@Injectable()
export class DrizzleAttachmentGroupRepository extends AttachmentGroupRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private toDomain(record: any): AttachmentGroup {
    return AttachmentGroup.create({
      id: record.id,
      createdById: record.createdById,
      key: record.key,
      ips: record.ips || [],
      attachmentIds: record.attachmentIds || [],
      createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
      expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined,
    });
  }

  async save(attachmentGroup: AttachmentGroup): Promise<AttachmentGroup> {
    const data = {
      id: attachmentGroup.id,
      createdById: attachmentGroup.createdById,
      key: attachmentGroup.key,
      ips: attachmentGroup.ips,
      createdAt: attachmentGroup.createdAt.toISOString(),
      updatedAt: attachmentGroup.updatedAt.toISOString(),
      expiresAt: attachmentGroup.expiresAt?.toISOString(),
    };

    const attachmentIds = attachmentGroup.attachmentIds;

    // Upsert using INSERT ... ON CONFLICT
    await this.db
      .insert(attachmentGroups)
      .values(data)
      .onConflictDoUpdate({
        target: attachmentGroups.id,
        set: {
          key: data.key,
          ips: data.ips,
          updatedAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
        },
      });

    // Delete existing attachment relations
    await this.db
      .delete(attachmentToAttachmentGroup)
      .where(eq(attachmentToAttachmentGroup.b, data.id));

    // Insert new attachment relations
    if (attachmentIds.length > 0) {
      await this.db.insert(attachmentToAttachmentGroup).values(
        attachmentIds.map((id) => ({
          a: id,
          b: data.id,
        })),
      );
    }

    // Fetch the complete record with attachments
    return this.findById(data.id);
  }

  async findById(id: string): Promise<AttachmentGroup | null> {
    const record = await this.db
      .select()
      .from(attachmentGroups)
      .where(eq(attachmentGroups.id, id))
      .limit(1);

    if (record.length === 0) {
      return null;
    }

    // Fetch attachment IDs
    const attachmentRelations = await this.db
      .select({ id: attachmentToAttachmentGroup.a })
      .from(attachmentToAttachmentGroup)
      .where(eq(attachmentToAttachmentGroup.b, id));

    const attachmentIds = attachmentRelations.map((rel) => rel.id);

    return this.toDomain({
      ...record[0],
      attachmentIds,
    });
  }

  async findByKey(key: string): Promise<AttachmentGroup | null> {
    const record = await this.db
      .select()
      .from(attachmentGroups)
      .where(eq(attachmentGroups.key, key))
      .limit(1);

    if (record.length === 0) {
      return null;
    }

    // Fetch attachment IDs
    const attachmentRelations = await this.db
      .select({ id: attachmentToAttachmentGroup.a })
      .from(attachmentToAttachmentGroup)
      .where(eq(attachmentToAttachmentGroup.b, record[0].id));

    const attachmentIds = attachmentRelations.map((rel) => rel.id);

    return this.toDomain({
      ...record[0],
      attachmentIds,
    });
  }

  async findByCreatedById(
    createdById: string,
    limit = 50,
    offset = 0,
  ): Promise<AttachmentGroup[]> {
    const records = await this.db
      .select()
      .from(attachmentGroups)
      .where(eq(attachmentGroups.createdById, createdById))
      .orderBy(desc(attachmentGroups.createdAt))
      .limit(limit)
      .offset(offset);

    if (records.length === 0) {
      return [];
    }

    // Fetch all attachment IDs for all groups in one query
    const groupIds = records.map((r) => r.id);
    const attachmentRelations = await this.db
      .select({
        groupId: attachmentToAttachmentGroup.b,
        attachmentId: attachmentToAttachmentGroup.a,
      })
      .from(attachmentToAttachmentGroup)
      .where(inArray(attachmentToAttachmentGroup.b, groupIds));

    // Group attachment IDs by group ID
    const attachmentMap = new Map<string, string[]>();
    for (const rel of attachmentRelations) {
      const existing = attachmentMap.get(rel.groupId) || [];
      existing.push(rel.attachmentId);
      attachmentMap.set(rel.groupId, existing);
    }

    // Map records to domain entities
    return records.map((record) =>
      this.toDomain({
        ...record,
        attachmentIds: attachmentMap.get(record.id) || [],
      }),
    );
  }

  async countByCreatedById(createdById: string): Promise<number> {
    const result = await this.db
      .select({ count: count().as('count') })
      .from(attachmentGroups)
      .where(eq(attachmentGroups.createdById, createdById));

    return Number(result[0]?.count || 0);
  }

  async removeById(id: string): Promise<AttachmentGroup | null> {
    const record = await this.findById(id);
    if (!record) return null;

    // Delete attachment relations first (cascade should handle this, but being explicit)
    await this.db
      .delete(attachmentToAttachmentGroup)
      .where(eq(attachmentToAttachmentGroup.b, id));

    // Delete the group
    await this.db.delete(attachmentGroups).where(eq(attachmentGroups.id, id));

    return record;
  }

  async update(
    id: string,
    update: Partial<
      Pick<AttachmentGroup, 'key' | 'ips' | 'attachmentIds' | 'expiresAt'>
    >,
  ): Promise<AttachmentGroup> {
    const data: Record<string, any> = {};

    if (update.key !== undefined) data.key = update.key;
    if (update.ips !== undefined) data.ips = update.ips;
    if (update.expiresAt !== undefined) data.expiresAt = update.expiresAt;

    const updateData: any = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Update the group
    await this.db
      .update(attachmentGroups)
      .set(updateData)
      .where(eq(attachmentGroups.id, id));

    // Update attachment relations if provided
    if (update.attachmentIds !== undefined) {
      // Delete existing relations
      await this.db
        .delete(attachmentToAttachmentGroup)
        .where(eq(attachmentToAttachmentGroup.b, id));

      // Insert new relations
      if (update.attachmentIds.length > 0) {
        await this.db.insert(attachmentToAttachmentGroup).values(
          update.attachmentIds.map((attachmentId) => ({
            a: attachmentId,
            b: id,
          })),
        );
      }
    }

    // Fetch and return the updated record
    return this.findById(id);
  }
}


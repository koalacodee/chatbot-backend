import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';
import {
  attachmentGroupMembers,
  attachmentGroups,
  attachments,
  attachmentToAttachmentGroup,
} from 'src/common/drizzle/schema';
import { eq, count, desc } from 'drizzle-orm';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';

@Injectable()
export class DrizzleAttachmentGroupRepository extends AttachmentGroupRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private async toDomain(record: any): Promise<AttachmentGroup> {
    // Fetch attachment IDs from the join table
    const attachmentLinks = await this.db
      .select()
      .from(attachmentToAttachmentGroup)
      .where(eq(attachmentToAttachmentGroup.b, record.id));

    const attachmentIds = attachmentLinks.map((link) => link.a);

    return AttachmentGroup.create({
      id: record.id,
      createdById: record.createdById,
      key: record.key,
      clientIds: record.ips ?? [],
      attachmentIds: attachmentIds,
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
      ips: attachmentGroup.clientIds,
      createdAt: attachmentGroup.createdAt.toISOString(),
      updatedAt: attachmentGroup.updatedAt.toISOString(),
      expiresAt: attachmentGroup.expiresAt?.toISOString() ?? null,
    };

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

    // Update attachment relationships
    // First, delete existing relationships
    await this.db
      .delete(attachmentToAttachmentGroup)
      .where(eq(attachmentToAttachmentGroup.b, attachmentGroup.id));

    // Then, insert new relationships
    if (attachmentGroup.attachmentIds.length > 0) {
      await this.db.insert(attachmentToAttachmentGroup).values(
        attachmentGroup.attachmentIds.map((attachmentId) => ({
          a: attachmentId,
          b: attachmentGroup.id,
        })),
      );
    }

    return this.findById(attachmentGroup.id);
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

    return this.toDomain(record[0]);
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

    return this.toDomain(record[0]);
  }

  async findByCreatedById(
    createdById: string,
    limit?: number,
    offset?: number,
  ): Promise<AttachmentGroup[]> {
    const baseQuery = this.db
      .select()
      .from(attachmentGroups)
      .where(eq(attachmentGroups.createdById, createdById))
      .orderBy(desc(attachmentGroups.createdAt));

    const records =
      limit !== undefined && offset !== undefined
        ? await baseQuery.limit(limit).offset(offset)
        : limit !== undefined
          ? await baseQuery.limit(limit)
          : offset !== undefined
            ? await baseQuery.offset(offset)
            : await baseQuery;

    return Promise.all(records.map((record) => this.toDomain(record)));
  }

  async countByCreatedById(createdById: string): Promise<number> {
    const result = await this.db
      .select({ count: count().as('count') })
      .from(attachmentGroups)
      .where(eq(attachmentGroups.createdById, createdById));

    return Number(result[0]?.count || 0);
  }

  async removeById(id: string): Promise<AttachmentGroup | null> {
    const attachmentGroup = await this.findById(id);
    if (!attachmentGroup) {
      return null;
    }

    // Delete attachment relationships first (cascade should handle this, but being explicit)
    await this.db
      .delete(attachmentToAttachmentGroup)
      .where(eq(attachmentToAttachmentGroup.b, id));

    // Delete the attachment group
    await this.db.delete(attachmentGroups).where(eq(attachmentGroups.id, id));

    return attachmentGroup;
  }

  async update(
    id: string,
    update: Partial<
      Pick<AttachmentGroup, 'key' | 'clientIds' | 'attachmentIds' | 'expiresAt'>
    >,
  ): Promise<AttachmentGroup> {
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (update.key !== undefined) {
      updateData.key = update.key;
    }

    if (update.clientIds !== undefined) {
      updateData.ips = update.clientIds;
    }

    if (update.expiresAt !== undefined) {
      updateData.expiresAt = update.expiresAt?.toISOString() ?? null;
    }

    await this.db
      .update(attachmentGroups)
      .set(updateData)
      .where(eq(attachmentGroups.id, id));

    // Update attachment relationships if provided
    if (update.attachmentIds !== undefined) {
      // Delete existing relationships
      await this.db
        .delete(attachmentToAttachmentGroup)
        .where(eq(attachmentToAttachmentGroup.b, id));

      // Insert new relationships
      if (update.attachmentIds.length > 0) {
        await this.db.insert(attachmentToAttachmentGroup).values(
          update.attachmentIds.map((attachmentId) => ({
            a: attachmentId,
            b: id,
          })),
        );
      }
    }

    return this.findById(id);
  }

  async getByMemberId(memberId: string): Promise<AttachmentGroup | null> {
    return await this.db
      .select()
      .from(attachmentGroups)
      .innerJoin(
        attachmentGroupMembers,
        eq(attachmentGroups.id, attachmentGroupMembers.attachmentGroupId),
      )
      .innerJoin(
        attachmentToAttachmentGroup,
        eq(attachmentGroups.id, attachmentToAttachmentGroup.b),
      )
      .innerJoin(attachments, eq(attachmentToAttachmentGroup.a, attachments.id))
      .where(eq(attachmentGroupMembers.id, memberId))
      .then((result) => {
        if (result.length === 0) {
          return null;
        }

        const attachmentGroupRaw = result[0].attachment_groups;

        const attachmentGroup = AttachmentGroup.create({
          id: attachmentGroupRaw.id,
          createdById: attachmentGroupRaw.createdById,
          key: attachmentGroupRaw.key,
          clientIds: attachmentGroupRaw.ips,
          attachments: result.map((attachment) =>
            Attachment.create({
              ...attachment.attachments,
              expirationDate: new Date(attachment.attachments.expirationDate),
              createdAt: new Date(attachment.attachments.createdAt),
              updatedAt: new Date(attachment.attachments.updatedAt),
            }),
          ),
          createdAt: new Date(attachmentGroupRaw.createdAt),
          updatedAt: new Date(attachmentGroupRaw.updatedAt),
          expiresAt: attachmentGroupRaw.expiresAt
            ? new Date(attachmentGroupRaw.expiresAt)
            : undefined,
        });

        return attachmentGroup;
      });
  }
}

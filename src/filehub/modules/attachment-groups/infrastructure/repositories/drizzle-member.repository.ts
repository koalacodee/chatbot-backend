import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { MemberRepository } from '../../domain/repositories/member.repository';
import {
  AttachmentGroupMember,
  AttachmentGroupMemberProps,
} from '../../domain/entities/member.entity';
import { attachmentGroupMembers } from 'src/common/drizzle/schema';
import { eq, count, desc } from 'drizzle-orm';

@Injectable()
export class DrizzleMemberRepository extends MemberRepository {
  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private toDomain(record: any): AttachmentGroupMember {
    return AttachmentGroupMember.create({
      id: record.id,
      attachmentGroupId: record.attachmentGroupId,
      memberId: record.memberId,
      name: record.name,
      createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
    });
  }

  async save(member: AttachmentGroupMember): Promise<AttachmentGroupMember> {
    const data = {
      id: member.id.value,
      attachmentGroupId: member.attachmentGroupId.value,
      memberId: member.memberId.value,
      name: member.name,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };

    await this.db
      .insert(attachmentGroupMembers)
      .values(data)
      .onConflictDoUpdate({
        target: attachmentGroupMembers.id,
        set: {
          name: data.name,
          memberId: data.memberId,
          updatedAt: new Date().toISOString(),
        },
      });

    return this.findById(member.id.value);
  }

  async findById(id: string): Promise<AttachmentGroupMember | null> {
    const record = await this.db
      .select()
      .from(attachmentGroupMembers)
      .where(eq(attachmentGroupMembers.id, id))
      .limit(1);

    if (record.length === 0) {
      return null;
    }

    return this.toDomain(record[0]);
  }

  async findByAttachmentGroupId(
    attachmentGroupId: string,
    limit?: number,
    offset?: number,
  ): Promise<AttachmentGroupMember[]> {
    const baseQuery = this.db
      .select()
      .from(attachmentGroupMembers)
      .where(eq(attachmentGroupMembers.attachmentGroupId, attachmentGroupId))
      .orderBy(desc(attachmentGroupMembers.createdAt));

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

  async countByAttachmentGroupId(attachmentGroupId: string): Promise<number> {
    const result = await this.db
      .select({ count: count().as('count') })
      .from(attachmentGroupMembers)
      .where(eq(attachmentGroupMembers.attachmentGroupId, attachmentGroupId));

    return Number(result[0]?.count || 0);
  }

  async removeById(id: string): Promise<AttachmentGroupMember | null> {
    const member = await this.findById(id);
    if (!member) {
      return null;
    }

    await this.db
      .delete(attachmentGroupMembers)
      .where(eq(attachmentGroupMembers.id, id));

    return member;
  }

  async update(
    id: string,
    update: Partial<AttachmentGroupMemberProps>,
  ): Promise<AttachmentGroupMember> {
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (update.name !== undefined) {
      updateData.name = update.name;
    }

    if (update.memberId !== undefined) {
      updateData.memberId = update.memberId;
    }

    if (update.attachmentGroupId !== undefined) {
      updateData.attachmentGroupId = update.attachmentGroupId;
    }

    await this.db
      .update(attachmentGroupMembers)
      .set(updateData)
      .where(eq(attachmentGroupMembers.id, id));

    return this.findById(id);
  }
}

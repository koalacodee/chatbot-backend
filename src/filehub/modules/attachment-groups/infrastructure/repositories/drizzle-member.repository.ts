import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { MemberRepository } from '../../domain/repositories/member.repository';
import {
  AttachmentGroupMember,
  AttachmentGroupMemberProps,
} from '../../domain/entities/member.entity';
import {
  attachmentGroupMembers,
  attachmentGroups,
  departments,
} from 'src/common/drizzle/schema';
import { eq, count, desc, inArray, and, SQL } from 'drizzle-orm';
import {
  createCursorPagination,
  CursorInput,
  PaginatedArrayResult,
} from 'src/common/drizzle/helpers/cursor';

type MemberCursorData = { createdAt: string; id: string };
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';

@Injectable()
export class DrizzleMemberRepository extends MemberRepository {
  private readonly pagination = createCursorPagination<MemberCursorData>({
    table: attachmentGroupMembers,
    cursorFields: [
      { column: attachmentGroupMembers.createdAt, key: 'createdAt' },
      { column: attachmentGroupMembers.id, key: 'id' },
    ],
    defaultPageSize: 10,
    sortDirection: 'desc',
  });

  constructor(private readonly drizzleService: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private toDomain(
    record: typeof attachmentGroupMembers.$inferSelect,
  ): AttachmentGroupMember {
    return AttachmentGroupMember.create({
      id: record.id,
      attachmentGroupId: record.attachmentGroupId,
      memberId: record.memberId,
      name: record.name,
      createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
      departmentId: record.departmentId ?? undefined,
    });
  }

  async save(member: AttachmentGroupMember): Promise<AttachmentGroupMember> {
    const data = {
      id: member.id.value,
      attachmentGroupId: member.attachmentGroupId.value,
      memberId: member.memberId.value,
      name: member.name,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      departmentId: member.departmentId?.value ?? null,
    };

    await this.db
      .insert(attachmentGroupMembers)
      .values(data)
      .onConflictDoUpdate({
        target: attachmentGroupMembers.id,
        set: {
          name: data.name,
          memberId: data.memberId,
          departmentId: data.departmentId,
          updatedAt: new Date(),
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
    const updateData: Partial<typeof attachmentGroupMembers.$inferSelect> = {
      updatedAt: new Date(),
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

    if (update.departmentId !== undefined) {
      updateData.departmentId = update.departmentId ?? null;
    }

    await this.db
      .update(attachmentGroupMembers)
      .set(updateData)
      .where(eq(attachmentGroupMembers.id, id));

    return this.findById(id);
  }

  async findAll(options: {
    cursor?: CursorInput;
    departmentIds?: string[];
  }): Promise<
    PaginatedArrayResult<{
      member: AttachmentGroupMember;
      department: { id: string; name: string } | null;
    }>
  > {
    if (options.departmentIds !== undefined && options.departmentIds.length === 0) {
      return { data: [], meta: { hasNextPage: false, hasPrevPage: false } };
    }

    const paginationParams = this.pagination.parseInput(options.cursor);
    const cursorCondition: SQL | undefined = paginationParams.cursorData
      ? this.pagination.buildCursorCondition(
          paginationParams.cursorData,
          paginationParams.direction,
        )
      : undefined;

    const whereConditions: SQL[] = [];
    if (
      options.departmentIds !== undefined &&
      options.departmentIds.length > 0
    ) {
      whereConditions.push(
        inArray(attachmentGroupMembers.departmentId, options.departmentIds),
      );
    }
    if (cursorCondition) {
      whereConditions.push(cursorCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    let query = this.db
      .select({
        member: attachmentGroupMembers,
        attachmentGroup: attachmentGroups,
        departmentId: departments.id,
        departmentName: departments.name,
      })
      .from(attachmentGroupMembers)
      .innerJoin(
        attachmentGroups,
        eq(attachmentGroupMembers.attachmentGroupId, attachmentGroups.id),
      )
      .leftJoin(
        departments,
        eq(attachmentGroupMembers.departmentId, departments.id),
      )
      .orderBy(...this.pagination.getOrderBy())
      .limit(paginationParams.limit)
      .$dynamic();

    const rows = whereClause ? await query.where(whereClause) : await query;

    const mapRow = (row: (typeof rows)[0]) => {
      const member = AttachmentGroupMember.create({
        id: row.member.id,
        attachmentGroupId: row.member.attachmentGroupId,
        memberId: row.member.memberId,
        name: row.member.name,
        createdAt: new Date(row.member.createdAt),
        updatedAt: new Date(row.member.updatedAt),
        departmentId: row.member.departmentId ?? undefined,
        attachmentGroup: AttachmentGroup.create({
          id: row.attachmentGroup.id,
          key: row.attachmentGroup.key,
          name: row.attachmentGroup.name,
          createdAt: new Date(row.attachmentGroup.createdAt),
          updatedAt: new Date(row.attachmentGroup.updatedAt),
          createdById: row.attachmentGroup.createdById,
        }),
      });
      const department =
        row.departmentId && row.departmentName
          ? { id: row.departmentId, name: row.departmentName }
          : null;
      return { member, department };
    };

    const { data, meta } = this.pagination.processResults(
      rows,
      {
        pageSize: paginationParams.pageSize,
        direction: paginationParams.direction,
        cursor: paginationParams.cursor,
      },
      (r) => ({
        createdAt:
          r.member.createdAt instanceof Date
            ? r.member.createdAt.toISOString()
            : String(r.member.createdAt),
        id: r.member.id,
      }),
    );

    return {
      data: data.map(mapRow),
      meta,
    };
  }
}

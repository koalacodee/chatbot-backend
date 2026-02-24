import {
  AttachmentGroupMember,
  AttachmentGroupMemberProps,
} from '../entities/member.entity';
import {
  CursorInput,
  PaginatedArrayResult,
} from 'src/common/drizzle/helpers/cursor';

export abstract class MemberRepository {
  abstract save(member: AttachmentGroupMember): Promise<AttachmentGroupMember>;
  abstract findById(id: string): Promise<AttachmentGroupMember | null>;
  abstract findByAttachmentGroupId(
    attachmentGroupId: string,
    limit?: number,
    offset?: number,
  ): Promise<AttachmentGroupMember[]>;
  abstract countByAttachmentGroupId(attachmentGroupId: string): Promise<number>;
  abstract removeById(id: string): Promise<AttachmentGroupMember | null>;
  abstract update(
    id: string,
    update: Partial<AttachmentGroupMemberProps>,
  ): Promise<AttachmentGroupMember>;
  abstract findAll(options: {
    cursor?: CursorInput;
    departmentIds?: string[];
    filterDepartmentId?: string | null;
  }): Promise<
    PaginatedArrayResult<{
      member: AttachmentGroupMember;
      department: { id: string; name: string } | null;
    }>
  >;
}

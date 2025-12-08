import {
  AttachmentGroupMember,
  AttachmentGroupMemberProps,
} from '../entities/member.entity';

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
}

import { AttachmentGroup } from '../entities/attachment-group.entity';

export abstract class AttachmentGroupRepository {
  abstract save(attachmentGroup: AttachmentGroup): Promise<AttachmentGroup>;
  abstract findById(id: string): Promise<AttachmentGroup | null>;
  abstract findByKey(key: string): Promise<AttachmentGroup | null>;
  abstract findByCreatedById(
    createdById: string,
    limit?: number,
    offset?: number,
  ): Promise<AttachmentGroup[]>;
  abstract countByCreatedById(createdById: string): Promise<number>;
  abstract removeById(id: string): Promise<AttachmentGroup | null>;
  abstract update(
    id: string,
    update: Partial<
      Pick<AttachmentGroup, 'key' | 'clientIds' | 'attachmentIds' | 'expiresAt'>
    >,
  ): Promise<AttachmentGroup>;
}

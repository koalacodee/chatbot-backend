import { Attachment } from '../entities/attachment.entity';

export abstract class AttachmentRepository {
  abstract save(attachment: Attachment): Promise<Attachment>;
  abstract findById(id: string): Promise<Attachment | null>;
  abstract exists(id: string): Promise<boolean>;

  // Target helpers
  abstract findByTargetId(targetId: string): Promise<Attachment[]>;
  abstract countByTargetId(targetId: string): Promise<number>;
  abstract removeByTargetId(targetId: string): Promise<Attachment[]>;

  abstract removeById(id: string): Promise<Attachment | null>;
  abstract update(
    id: string,
    update: Partial<Pick<Attachment, 'name' | 'type' | 'dataUrl' | 'targetId'>>,
  ): Promise<Attachment>;
}

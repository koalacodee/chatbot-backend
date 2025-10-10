import { Attachment } from '../entities/attachment.entity';

export abstract class AttachmentRepository {
  abstract save(attachment: Attachment): Promise<Attachment>;
  abstract findById(id: string): Promise<Attachment | null>;
  abstract exists(id: string): Promise<boolean>;

  // Target helpers
  abstract findByTargetId(targetId: string): Promise<Attachment[]>;
  abstract countByTargetId(targetId: string): Promise<number>;
  abstract removeByTargetId(targetId: string): Promise<Attachment[]>;

  // User helpers
  abstract findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Attachment[]>;
  abstract countByUserId(userId: string): Promise<number>;

  // Global helpers
  abstract findGlobalAttachments(
    limit?: number,
    offset?: number,
  ): Promise<Attachment[]>;
  abstract countGlobalAttachments(): Promise<number>;

  // Combined user and global helpers
  abstract findUserAndGlobalAttachments(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Attachment[]>;
  abstract countUserAndGlobalAttachments(userId: string): Promise<number>;

  abstract removeById(id: string): Promise<Attachment | null>;
  abstract update(
    id: string,
    update: Partial<
      Pick<
        Attachment,
        'type' | 'filename' | 'originalName' | 'expirationDate' | 'targetId'
      >
    >,
  ): Promise<Attachment>;
}

import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { FileManagementClass } from '../../domain/services/file-mangement.service';

interface ShareAttachmentInput {
  attachmentId: string;
  userId: string;
  expirationDate?: Date;
}

export interface ShareAttachmentResult {
  shareKey: string;
  expiresAt: Date;
}

@Injectable()
export class ShareAttachmentUseCase {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileManagementService: FileManagementClass,
  ) {}

  async execute({
    attachmentId,
    userId,
    expirationDate,
  }: ShareAttachmentInput): Promise<ShareAttachmentResult> {
    // Find the attachment
    const attachment = await this.attachmentRepository.findById(attachmentId);
    if (!attachment) {
      throw new BadRequestException('Attachment not found');
    }

    // Check if user has access to the attachment
    const hasAccess = this.checkUserAccess(attachment, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this attachment');
    }

    // Calculate expiration time (default to 1 hour if not provided)
    const expiresIn = this.calculateExpirationTime(expirationDate);

    // Generate share key using file management service
    const shareKey = await this.fileManagementService.genShareKey(
      attachmentId,
      expiresIn
    );

    // Calculate when the share key expires
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      shareKey,
      expiresAt,
    };
  }

  private checkUserAccess(attachment: any, userId: string): boolean {
    // User can access if:
    // 1. They are the owner of the attachment (attachment.userId matches)
    // 2. The attachment is global (attachment.isGlobal is true)
    return attachment.userId === userId || attachment.isGlobal === true;
  }

  private calculateExpirationTime(expirationDate?: Date): number {
    if (expirationDate) {
      const now = Date.now();
      const expirationTime = expirationDate.getTime();
      const seconds = Math.max(60, Math.floor((expirationTime - now) / 1000)); // Minimum 60 seconds
      return seconds;
    }
    // Default to 1 hour (3600 seconds)
    return 3600;
  }
}

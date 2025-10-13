import { Injectable, BadRequestException } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { Attachment } from '../../domain/entities/attachment.entity';

interface CloneAttachmentInput {
  attachmentIds: string[];
  targetId: string;
}

export interface ClonedAttachmentResult {
  id: string;
  originalId: string;
  filename: string;
  originalName: string;
  type: string;
  size: number;
  targetId: string;
  userId?: string;
  guestId?: string;
  isGlobal: boolean;
  expirationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CloneAttachmentUseCase {
  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  async execute({
    attachmentIds,
    targetId,
  }: CloneAttachmentInput): Promise<ClonedAttachmentResult[]> {
    if (!attachmentIds || attachmentIds.length === 0) {
      throw new BadRequestException(
        'At least one attachment ID must be provided',
      );
    }

    if (!targetId) {
      throw new BadRequestException('Target ID must be provided');
    }

    const originalAttachments =
      await this.attachmentRepository.findByIds(attachmentIds);

    // Process all attachments in parallel for better performance
    const clonePromises = originalAttachments.map(
      async (originalAttachment) => {
        // Create a new attachment with the same data but different targetId
        const clonedAttachment = await this.attachmentRepository.save(
          Attachment.create({
            type: originalAttachment.type,
            filename: originalAttachment.filename, // Keep the same filename (file already exists)
            originalName: originalAttachment.originalName,
            expirationDate: originalAttachment.expirationDate,
            targetId: targetId, // Use the new targetId
            userId: originalAttachment.userId,
            guestId: originalAttachment.guestId,
            isGlobal: originalAttachment.isGlobal,
            size: originalAttachment.size,
          }),
        );

        // Convert to result format
        return {
          id: clonedAttachment.id,
          originalId: originalAttachment.id,
          filename: clonedAttachment.filename,
          originalName: clonedAttachment.originalName,
          type: clonedAttachment.type,
          size: clonedAttachment.size,
          targetId: clonedAttachment.targetId || '',
          userId: clonedAttachment.userId || undefined,
          guestId: clonedAttachment.guestId || undefined,
          isGlobal: clonedAttachment.isGlobal,
          expirationDate: clonedAttachment.expirationDate || undefined,
          createdAt: clonedAttachment.createdAt,
          updatedAt: clonedAttachment.updatedAt,
        };
      },
    );

    // Wait for all attachments to be cloned in parallel
    const clonedAttachments = await Promise.all(clonePromises);

    return clonedAttachments;
  }
}

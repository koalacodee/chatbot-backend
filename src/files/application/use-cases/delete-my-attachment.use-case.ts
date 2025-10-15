import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

interface DeleteMyAttachmentInput {
  attachmentId: string;
  userId: string;
}

export interface DeleteMyAttachmentResult {
  success: boolean;
  message: string;
}

@Injectable()
export class DeleteMyAttachmentUseCase {
  private readonly logger = new Logger(DeleteMyAttachmentUseCase.name);

  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  async execute({
    attachmentId,
    userId,
  }: DeleteMyAttachmentInput): Promise<DeleteMyAttachmentResult> {
    this.logger.log(
      `User ${userId} attempting to delete attachment ${attachmentId}`,
    );

    // Get attachment from database
    const attachment = await this.attachmentRepository.findById(attachmentId);

    if (!attachment) {
      this.logger.warn(`Attachment not found: ${attachmentId}`);
      throw new NotFoundException(
        `Attachment with ID ${attachmentId} not found`,
      );
    }

    // Check if the user has permission to delete this attachment
    if (attachment.userId !== userId) {
      this.logger.warn(
        `User ${userId} attempted to delete attachment ${attachmentId} that belongs to user ${attachment.userId}`,
      );
      throw new UnauthorizedException(
        'You do not have permission to delete this attachment',
      );
    }

    try {
      // Delete physical file from disk
      const filePath = join(process.cwd(), 'uploads', attachment.filename);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
          this.logger.log(`Deleted file from disk: ${filePath}`);
        } catch (fileError) {
          this.logger.error(
            `Failed to delete file from disk: ${filePath}`,
            fileError,
          );
          return {
            success: false,
            message: `Failed to delete file from disk: ${fileError.message}`,
          };
        }
      } else {
        this.logger.warn(`File not found on disk: ${filePath}`);
        // Continue with database deletion even if file doesn't exist
      }

      // Delete attachment from database
      await this.attachmentRepository.removeById(attachmentId);
      this.logger.log(`Deleted attachment from database: ${attachmentId}`);

      return {
        success: true,
        message: 'Attachment deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete attachment ${attachmentId}:`, error);
      return {
        success: false,
        message: `Failed to delete attachment: ${error.message}`,
      };
    }
  }
}

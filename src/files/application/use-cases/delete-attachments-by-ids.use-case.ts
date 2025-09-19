import { Injectable, Logger } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

interface DeleteAttachmentsByIdsInput {
  attachmentIds: string[];
}

export interface DeleteAttachmentsByIdsResult {
  deletedCount: number;
  failedDeletions: Array<{
    attachmentId: string;
    reason: string;
  }>;
}

@Injectable()
export class DeleteAttachmentsByIdsUseCase {
  private readonly logger = new Logger(DeleteAttachmentsByIdsUseCase.name);

  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  async execute({
    attachmentIds,
  }: DeleteAttachmentsByIdsInput): Promise<DeleteAttachmentsByIdsResult> {
    this.logger.log(`Deleting ${attachmentIds.length} attachments by IDs`);

    const failedDeletions: Array<{
      attachmentId: string;
      reason: string;
    }> = [];

    let deletedCount = 0;

    for (const attachmentId of attachmentIds) {
      try {
        this.logger.log(`Processing attachment ID: ${attachmentId}`);

        // Get attachment from database
        const attachment =
          await this.attachmentRepository.findById(attachmentId);
        if (!attachment) {
          this.logger.warn(`Attachment not found: ${attachmentId}`);
          failedDeletions.push({
            attachmentId,
            reason: 'Attachment not found in database',
          });
          continue;
        }

        this.logger.log(`Found attachment: ${attachment.filename}`);

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
            failedDeletions.push({
              attachmentId,
              reason: `Failed to delete file from disk: ${fileError.message}`,
            });
            continue;
          }
        } else {
          this.logger.warn(`File not found on disk: ${filePath}`);
          // Continue with database deletion even if file doesn't exist
        }

        // Delete attachment from database
        await this.attachmentRepository.removeById(attachmentId);
        this.logger.log(`Deleted attachment from database: ${attachmentId}`);
        deletedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to delete attachment ${attachmentId}:`,
          error,
        );
        failedDeletions.push({
          attachmentId,
          reason: `Database deletion failed: ${error.message}`,
        });
      }
    }

    this.logger.log(
      `Deletion completed. Deleted: ${deletedCount}, Failed: ${failedDeletions.length}`,
    );

    return {
      deletedCount,
      failedDeletions,
    };
  }
}

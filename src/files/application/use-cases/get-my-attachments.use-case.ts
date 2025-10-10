import { Injectable } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { Attachment } from '../../domain/entities/attachment.entity';

interface GetMyAttachmentsInput {
  userId: string;
  limit?: number;
  offset?: number;
}

interface GetMyAttachmentsOutput {
  attachments: Attachment[];
  totalCount: number;
  hasMore: boolean;
}

@Injectable()
export class GetMyAttachmentsUseCase {
  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  async execute({
    userId,
    limit = 50,
    offset = 0,
  }: GetMyAttachmentsInput): Promise<GetMyAttachmentsOutput> {
    // Get combined attachments (user's + global) with filtering, sorting, and pagination in single query
    const [attachments, totalCount] = await Promise.all([
      this.attachmentRepository.findUserAndGlobalAttachments(
        userId,
        limit,
        offset,
      ),
      this.attachmentRepository.countUserAndGlobalAttachments(userId),
    ]);

    const hasMore = offset + limit < totalCount;

    return {
      attachments,
      totalCount,
      hasMore,
    };
  }
}

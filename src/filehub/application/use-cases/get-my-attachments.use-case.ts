import { Injectable, Logger } from '@nestjs/common';
import { CursorInput } from 'src/common/drizzle/helpers/cursor';
import { AttachmentRepository } from 'src/filehub/domain/repositories/attachment.repository';
import {
  FileHubService,
  SignedUrlBatch,
} from 'src/filehub/domain/services/filehub.service';
import { FilehubAttachmentMessage } from './get-target-attachments-with-signed-urls.use-case';

export interface GetMyAttachmentsInput {
  userId: string;
  expiresInMs?: number;
  cursor?: CursorInput;
}

@Injectable()
export class GetMyAttachmentsUseCase {
  private readonly logger = new Logger(GetMyAttachmentsUseCase.name);

  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(input: GetMyAttachmentsInput): Promise<{
    data: FilehubAttachmentMessage[];
    meta: { nextCursor?: string; prevCursor?: string; hasNextPage: boolean; hasPrevPage: boolean };
  }> {
    const { userId, expiresInMs, cursor } = input;

    this.logger.log(`[GetMyAttachments] Starting for userId: ${userId}`);

    if (!userId) {
      this.logger.warn('[GetMyAttachments] No userId, returning empty');
      return { data: [], meta: { hasNextPage: false, hasPrevPage: false } };
    }

    // Fetch paginated attachments for the user (user's attachments + global attachments)
    const { data: allAttachments, meta } =
      await this.attachmentRepository.findUserAndGlobalAttachmentsPaginated(
        userId,
        cursor,
      );

    this.logger.log(
      `[GetMyAttachments] Fetched ${allAttachments.length} attachments from DB`,
    );

    if (allAttachments.length === 0) {
      return { data: [], meta };
    }

    // Get unique filenames to avoid duplicate signed URL requests
    const uniqueFilenames = Array.from(
      new Set(allAttachments.map((attachment) => attachment.filename)),
    );

    this.logger.log(
      `[GetMyAttachments] Requesting signed URLs for ${uniqueFilenames.length} unique filenames`,
    );

    // Bulk get signed URLs for all unique filenames
    const signedUrlBatch = await this.fileHubService.getSignedUrlBatch(
      uniqueFilenames,
      expiresInMs,
    );

    this.logger.log(
      `[GetMyAttachments] Batch API returned ${signedUrlBatch?.length ?? 0} signed URLs, isArray=${Array.isArray(signedUrlBatch)}`,
    );

    // Create a lookup map for quick access
    const signedUrlMap = this.createSignedUrlLookup(signedUrlBatch);

    const missingFilenames = uniqueFilenames.filter(
      (fn) => !signedUrlMap.has(fn),
    );
    if (missingFilenames.length > 0) {
      this.logger.warn(
        `[GetMyAttachments] ${missingFilenames.length} filenames missing from batch response: ${missingFilenames.slice(0, 5).join(', ')}${missingFilenames.length > 5 ? '...' : ''}`,
      );
    }

    // Map attachments to FilehubAttachmentMessage format
    // Filter out attachments that don't have signed URLs
    const result = allAttachments
      .map((attachment) => {
        const signedUrl = signedUrlMap.get(attachment.filename);
        if (!signedUrl) {
          this.logger.debug(
            `[GetMyAttachments] Filtering out attachment id=${attachment.id} (no signed URL for filename: ${attachment.filename})`,
          );
          return null;
        }
        return {
          ...attachment.toJSON(),
          signedUrl,
        };
      })
      .filter(
        (message): message is FilehubAttachmentMessage => message !== null,
      );

    this.logger.log(
      `[GetMyAttachments] Returning ${result.length} attachments (filtered out ${allAttachments.length - result.length})`,
    );

    return { data: result, meta };
  }

  private createSignedUrlLookup(batch: SignedUrlBatch[]): Map<string, string> {
    return batch.reduce<Map<string, string>>((map, item) => {
      map.set(item.filename, item.signedUrl);
      return map;
    }, new Map());
  }
}

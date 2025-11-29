import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AttachmentRepository } from 'src/filehub/domain/repositories/attachment.repository';

export interface DeleteMyAttachmentsInput {
  userId: string;
  attachmentIds: string[];
}

export interface DeleteMyAttachmentsOutput {
  deletedIds: string[];
}

@Injectable()
export class DeleteMyAttachmentsUseCase {
  constructor(private readonly attachmentRepository: AttachmentRepository) {}

  async execute(
    input: DeleteMyAttachmentsInput,
  ): Promise<DeleteMyAttachmentsOutput> {
    const { userId, attachmentIds } = input;

    if (!userId) {
      throw new BadRequestException({
        details: [{ field: 'userId', message: 'userId is required' }],
      });
    }

    if (!attachmentIds || attachmentIds.length === 0) {
      throw new BadRequestException({
        details: [
          {
            field: 'attachmentIds',
            message: 'At least one attachmentId is required',
          },
        ],
      });
    }

    const attachments =
      await this.attachmentRepository.findByIds(attachmentIds);

    if (attachments.length !== attachmentIds.length) {
      throw new BadRequestException({
        details: [
          {
            field: 'attachmentIds',
            message: 'One or more attachments do not exist',
          },
        ],
      });
    }

    const unauthorized = attachments.filter((a) => a.userId !== userId);

    if (unauthorized.length > 0) {
      throw new ForbiddenException({
        details: [
          {
            field: 'attachmentIds',
            message: 'You do not own all of the requested attachments',
          },
        ],
      });
    }

    const deletedIds: string[] = [];

    for (const id of attachmentIds) {
      const deleted = await this.attachmentRepository.removeById(id);
      if (deleted) {
        deletedIds.push(id);
      }
    }

    return { deletedIds };
  }
}

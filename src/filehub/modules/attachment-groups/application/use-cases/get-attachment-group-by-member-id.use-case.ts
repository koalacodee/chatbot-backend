import { Injectable } from '@nestjs/common';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

export interface GetAttachmentGroupByMemberIdUseCaseInput {
  memberId: string;
}

@Injectable()
export class GetAttachmentGroupByMemberIdUseCase {
  constructor(
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(input: GetAttachmentGroupByMemberIdUseCaseInput) {
    const attachmentGroup = await this.attachmentGroupRepository.getByMemberId(
      input.memberId,
    );

    const attachmentFileNames = new Set<string>();

    attachmentGroup.attachments.forEach((attachment) => {
      attachmentFileNames.add(attachment.filename);
    });

    const signedUrls = await this.fileHubService.getSignedUrlBatch(
      Array.from(attachmentFileNames),
      7 * 24 * 60 * 60 * 1000,
    );

    const fileHubAttachments: FilehubAttachmentMessage[] =
      attachmentGroup.attachments.map((attachment) => {
        return {
          ...attachment.toJSON(),
          signedUrl: signedUrls.find(
            (url) => url.filename === attachment.filename,
          )?.signedUrl,
        };
      });

    return { attachmentGroup, fileHubAttachments };
  }
}

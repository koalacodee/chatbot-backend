import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MemberRepository } from '../../domain/repositories/member.repository';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentGroupMemberGateway } from '../../interface/websocket/member.gateway';
import { AttachmentRepository } from 'src/filehub/domain/repositories/attachment.repository';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

export interface UpdateMemberUseCaseRequest {
  memberId: string;
  name?: string;
  attachmentGroupId?: string;
}

export interface UpdateMemberUseCaseResponse {
  id: string;
  name: string;
  memberId: string;
  attachmentGroupId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UpdateMemberUseCase {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly memberGateway: AttachmentGroupMemberGateway,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    request: UpdateMemberUseCaseRequest,
  ): Promise<UpdateMemberUseCaseResponse> {
    const { memberId, name, attachmentGroupId } = request;

    // Validate that at least one field is provided
    if (!name && !attachmentGroupId) {
      throw new BadRequestException(
        'At least one field (name or attachmentGroupId) must be provided for update',
      );
    }

    // Check if the member exists
    const existingMember = await this.memberRepository.findById(memberId);
    if (!existingMember) {
      throw new NotFoundException(
        `Attachment group member with ID ${memberId} not found`,
      );
    }

    // Store the old attachmentGroupId if it's being updated
    const oldAttachmentGroupId =
      attachmentGroupId !== undefined &&
      existingMember.attachmentGroupId.value !== attachmentGroupId
        ? existingMember.attachmentGroupId.value
        : null;

    // If attachmentGroupId is being updated, verify the new group exists
    if (attachmentGroupId) {
      const attachmentGroup =
        await this.attachmentGroupRepository.findById(attachmentGroupId);
      if (!attachmentGroup) {
        throw new NotFoundException(
          `Attachment group with ID ${attachmentGroupId} not found`,
        );
      }
    }

    // Prepare update data
    const updateData: { name?: string; attachmentGroupId?: string } = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (attachmentGroupId !== undefined) {
      updateData.attachmentGroupId = attachmentGroupId;
    }

    // Use the update method from the repository
    const updatedMember = await this.memberRepository.update(
      memberId,
      updateData,
    );

    // If attachmentGroupId was updated, handle room movement and notifications
    if (oldAttachmentGroupId && attachmentGroupId) {
      // Get the new attachment group and its attachments
      const newAttachmentGroup =
        await this.attachmentGroupRepository.findById(attachmentGroupId);
      if (newAttachmentGroup) {
        // Get attachments for the new group
        const attachments = await this.attachmentRepository.findByIds(
          newAttachmentGroup.attachmentIds,
        );

        // Get unique filenames for signed URLs
        const uniqueFilenames = Array.from(
          new Set(attachments.map((attachment) => attachment.filename)),
        );

        // Get signed URLs
        const signedUrlBatch = await this.fileHubService.getSignedUrlBatch(
          uniqueFilenames,
          7 * 24 * 60 * 60 * 1000, // 7 days
        );

        // Create a lookup map for signed URLs
        const signedUrlMap = new Map<string, string>();
        signedUrlBatch.forEach((item) => {
          signedUrlMap.set(item.filename, item.signedUrl);
        });

        // Format attachments as FilehubAttachmentMessage
        const fileHubAttachments: FilehubAttachmentMessage[] = attachments
          .map((attachment) => {
            const signedUrl = signedUrlMap.get(attachment.filename);
            if (!signedUrl) {
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

        // Move member from old room to new room
        await this.memberGateway.moveMemberToNewGroup(
          memberId,
          oldAttachmentGroupId,
          attachmentGroupId,
        );

        // Notify about attachments change
        await this.memberGateway.notifyAttachmentsChange(
          attachmentGroupId,
          fileHubAttachments,
        );
      }
    }

    return {
      id: updatedMember.id.value,
      name: updatedMember.name,
      memberId: updatedMember.memberId.value,
      attachmentGroupId: updatedMember.attachmentGroupId.value,
      createdAt: updatedMember.createdAt,
      updatedAt: updatedMember.updatedAt,
    };
  }
}

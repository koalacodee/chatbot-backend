import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MemberRepository } from '../../domain/repositories/member.repository';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';

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

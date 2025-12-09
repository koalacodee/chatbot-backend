import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberRepository } from '../../domain/repositories/member.repository';

export interface DeleteMemberUseCaseRequest {
  memberId: string;
}

export interface DeleteMemberUseCaseResponse {
  success: boolean;
  deletedMember: {
    id: string;
    name: string;
    memberId: string;
    attachmentGroupId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

@Injectable()
export class DeleteMemberUseCase {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(
    request: DeleteMemberUseCaseRequest,
  ): Promise<DeleteMemberUseCaseResponse> {
    const { memberId } = request;

    // Use the removeById method from the repository
    const deletedMember = await this.memberRepository.removeById(memberId);

    if (!deletedMember) {
      throw new NotFoundException(
        `Attachment group member with ID ${memberId} not found`,
      );
    }

    return {
      success: true,
      deletedMember: {
        id: deletedMember.id.value,
        name: deletedMember.name,
        memberId: deletedMember.memberId.value,
        attachmentGroupId: deletedMember.attachmentGroupId.value,
        createdAt: deletedMember.createdAt,
        updatedAt: deletedMember.updatedAt,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { MemberRepository } from '../../domain/repositories/member.repository';
import { AttachmentGroupMember } from '../../domain/entities/member.entity';

export interface GetAllMembersWithGroupsUseCaseRequest {
  limit?: number;
  offset?: number;
}

export interface MemberWithGroupDetails {
  id: string;
  memberId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  attachmentGroup: {
    id: string;
    key: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
  };
}

export interface GetAllMembersWithGroupsUseCaseResponse {
  members: MemberWithGroupDetails[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

@Injectable()
export class GetAllMembersWithGroupsUseCase {
  constructor(private readonly memberRepository: MemberRepository) {}

  async execute(
    request: GetAllMembersWithGroupsUseCaseRequest,
  ): Promise<GetAllMembersWithGroupsUseCaseResponse> {
    const { limit = 10, offset = 0 } = request;

    // Leverage the findAll method which includes attachment group details via inner join
    const members = await this.memberRepository.findAll({ limit, offset });

    // Transform to response format
    const membersWithGroupDetails: MemberWithGroupDetails[] = members.map(
      (member) => ({
        id: member.id.value,
        memberId: member.memberId.value,
        name: member.name,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        attachmentGroup: {
          id: member.attachmentGroup.id,
          key: member.attachmentGroup.key,
          createdAt: member.attachmentGroup.createdAt,
          updatedAt: member.attachmentGroup.updatedAt,
          createdById: member.attachmentGroup.createdById,
        },
      }),
    );

    // Check if there might be more results
    const hasMore = members.length === limit;

    return {
      members: membersWithGroupDetails,
      pagination: {
        limit,
        offset,
        hasMore,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { MemberRepository } from '../../domain/repositories/member.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { CursorInput, CursorMeta } from 'src/common/drizzle/helpers/cursor';

export interface GetAllMembersWithGroupsUseCaseRequest {
  cursor?: CursorInput;
  userId: string;
  filterDepartmentId?: string | null;
}

export interface MemberWithGroupDetails {
  id: string;
  memberId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  attachmentGroup: {
    id: string;
    name: string;
    key: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
  };
  department: { id: string; name: string } | null;
}

export interface GetAllMembersWithGroupsUseCaseResponse {
  members: MemberWithGroupDetails[];
  meta: CursorMeta;
}

@Injectable()
export class GetAllMembersWithGroupsUseCase {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    request: GetAllMembersWithGroupsUseCaseRequest,
  ): Promise<GetAllMembersWithGroupsUseCaseResponse> {
    const { cursor, userId, filterDepartmentId } = request;

    let departmentIds: string[] | undefined;

    const user = await this.userRepository.findById(userId);
    const userRole = user.role.getRole();

    if (userRole === Roles.ADMIN) {
      departmentIds = undefined;
    } else if (userRole === Roles.SUPERVISOR) {
      const depts =
        await this.departmentRepository.getSupervisorDepartments({
          supervisorIdOrUserId: { supervisorUserId: userId },
          fullDepartment: false,
          onlyExposedToTvContent: true,
        });
      departmentIds = depts.map((d) => d.id);
    } else if (userRole === Roles.EMPLOYEE) {
      const subDepts =
        await this.departmentRepository.getEmployeeSubDepartments(
          { employeeUserId: userId },
          false,
          { onlyExposedToTvContent: true },
        );
      departmentIds = subDepts.map((d) => d.id);
    } else {
      departmentIds = [];
    }

    // Access control: supervisor/employee can only filter by departments they have access to
    if (
      filterDepartmentId !== undefined &&
      filterDepartmentId !== null &&
      departmentIds !== undefined &&
      !departmentIds.includes(filterDepartmentId)
    ) {
      return { members: [], meta: { hasNextPage: false, hasPrevPage: false } };
    }

    const { data: membersWithDepts, meta } =
      await this.memberRepository.findAll({
        cursor,
        departmentIds,
        filterDepartmentId,
      });

    // Transform to response format
    const membersWithGroupDetails: MemberWithGroupDetails[] =
      membersWithDepts.map(({ member, department }) => ({
        id: member.id.value,
        memberId: member.memberId.value,
        name: member.name,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        attachmentGroup: {
          id: member.attachmentGroup.id,
          name: member.attachmentGroup.name,
          key: member.attachmentGroup.key,
          createdAt: member.attachmentGroup.createdAt,
          updatedAt: member.attachmentGroup.updatedAt,
          createdById: member.attachmentGroup.createdById,
        },
        department,
      }));

    return {
      members: membersWithGroupDetails,
      meta,
    };
  }
}

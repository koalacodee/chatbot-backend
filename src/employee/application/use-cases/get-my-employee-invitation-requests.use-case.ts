import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  EmployeeInvitationService,
  InvitationStatus,
} from '../../infrastructure/services/employee-invitation.service';

interface GetMyEmployeeInvitationRequestsUseCaseInput {
  status?: InvitationStatus;
}

export interface MyEmployeeInvitationRequestDetails {
  token: string;
  fullName: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  subDepartmentNames: string[];
  permissions: string[];
  status: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

interface GetMyEmployeeInvitationRequestsUseCaseOutput {
  requests: MyEmployeeInvitationRequestDetails[];
}

@Injectable()
export class GetMyEmployeeInvitationRequestsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly invitationService: EmployeeInvitationService,
  ) {}

  async execute(
    input: GetMyEmployeeInvitationRequestsUseCaseInput,
    requestingUserId: string,
  ): Promise<GetMyEmployeeInvitationRequestsUseCaseOutput> {
    if (!requestingUserId) {
      throw new BadRequestException({
        details: [
          { field: 'requestingUserId', message: 'User ID is required' },
        ],
      });
    }

    const user = await this.userRepository.findById(requestingUserId);
    if (!user) {
      throw new BadRequestException({
        details: [{ field: 'requestingUserId', message: 'User not found' }],
      });
    }

    const userRole = user.role.getRole();

    // Only supervisors can view their own invitation requests
    if (userRole !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        details: [
          {
            field: 'root',
            message:
              'Only supervisors can view their employee invitation requests',
          },
        ],
      });
    }

    // Get invitations requested by this supervisor
    const invitations =
      await this.invitationService.getInvitationsByRequestedBy(
        requestingUserId,
        input.status,
      );

    const requests: MyEmployeeInvitationRequestDetails[] = [];

    for (const { token, data } of invitations) {
      // Get sub-department names
      const subDepartments = await this.departmentRepository.findByIds(
        data.subDepartmentIds,
      );
      const subDepartmentNames = subDepartments.map((dept) => dept.name);

      // Get approver name if exists
      let approvedByName: string | undefined;
      if (data.approvedBy) {
        const approver = await this.userRepository.findById(data.approvedBy);
        approvedByName = approver?.name || 'Unknown User';
      }

      requests.push({
        token,
        fullName: data.fullName,
        email: data.email,
        employeeId: data.employeeId,
        jobTitle: data.jobTitle,
        subDepartmentNames,
        permissions: data.permissions,
        status: data.status,
        approvedBy: data.approvedBy,
        approvedByName,
        approvedAt: data.approvedAt,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      });
    }

    // Sort by creation date (newest first)
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { requests };
  }
}

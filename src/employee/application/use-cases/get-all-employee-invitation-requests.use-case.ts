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

interface GetAllEmployeeInvitationRequestsUseCaseInput {
  status?: InvitationStatus;
}

export interface EmployeeInvitationRequestDetails {
  token: string;
  fullName: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  supervisorId: string;
  supervisorName: string;
  subDepartmentNames: string[];
  permissions: string[];
  status: string;
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

interface GetAllEmployeeInvitationRequestsUseCaseOutput {
  requests: EmployeeInvitationRequestDetails[];
}

@Injectable()
export class GetAllEmployeeInvitationRequestsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly invitationService: EmployeeInvitationService,
  ) {}

  async execute(
    input: GetAllEmployeeInvitationRequestsUseCaseInput,
    requestingUserId: string,
  ): Promise<GetAllEmployeeInvitationRequestsUseCaseOutput> {
    if (!requestingUserId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.userRepository.findById(requestingUserId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const userRole = user.role.getRole();

    // Only admins can view all invitation requests
    if (userRole !== Roles.ADMIN) {
      throw new ForbiddenException(
        'Only admins can view all employee invitation requests',
      );
    }

    // Get all invitations by status
    const invitations = await this.invitationService.getAllInvitationsByStatus(
      input.status,
    );

    const requests: EmployeeInvitationRequestDetails[] = [];

    for (const { token, data } of invitations) {
      // Get supervisor details
      const supervisor = await this.supervisorRepository.findById(
        data.supervisorId,
      );
      const supervisorName = supervisor?.user?.name || 'Unknown Supervisor';

      // Get sub-department names
      const subDepartments = await this.departmentRepository.findByIds(
        data.subDepartmentIds,
      );
      const subDepartmentNames = subDepartments.map((dept) => dept.name);

      // Get requester name
      const requester = await this.userRepository.findById(data.requestedBy);
      const requestedByName = requester?.name || 'Unknown User';

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
        supervisorId: data.supervisorId,
        supervisorName,
        subDepartmentNames,
        permissions: data.permissions,
        status: data.status,
        requestedBy: data.requestedBy,
        requestedByName,
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

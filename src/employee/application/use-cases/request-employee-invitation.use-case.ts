import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  EmployeeInvitationService,
  InvitationStatus,
} from '../../infrastructure/services/employee-invitation.service';
import { DepartmentHierarchyService } from 'src/department/application/services/department-hierarchy.service';

interface RequestEmployeeInvitationUseCaseInput {
  email: string;
  fullName: string;
  jobTitle: string;
  employeeId?: string;
  permissions: EmployeePermissionsEnum[];
  subDepartmentIds: string[];
}

export interface EmployeeInvitationRequestStatus {
  token: string;
  fullName: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  supervisorId: string;
  subDepartmentNames: string[];
  permissions: EmployeePermissionsEnum[];
  status: string;
  requestedBy: string;
  createdAt: Date;
  expiresAt: Date;
}

interface RequestEmployeeInvitationUseCaseOutput {
  request: EmployeeInvitationRequestStatus;
  message: string;
}

@Injectable()
export class RequestEmployeeInvitationUseCase {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly invitationService: EmployeeInvitationService,
    private readonly departmentHierarchyService: DepartmentHierarchyService,
  ) {}

  async execute(
    input: RequestEmployeeInvitationUseCaseInput,
    requestingUserId: string,
  ): Promise<RequestEmployeeInvitationUseCaseOutput> {
    if (!requestingUserId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.userRepository.findById(requestingUserId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const userRole = user.role.getRole();

    // Only supervisors can request employee invitations
    if (userRole !== Roles.SUPERVISOR) {
      throw new ForbiddenException(
        'Only supervisors can request employee invitations',
      );
    }

    const supervisor =
      await this.supervisorRepository.findByUserId(requestingUserId);
    if (!supervisor) {
      throw new BadRequestException('Supervisor not found');
    }

    const supervisorDepartmentIds = supervisor.departments.map((d) =>
      d.id.toString(),
    );

    // Check if supervisor can assign employees to the requested sub-departments
    const hasAccess = this.departmentHierarchyService.hasHierarchicalAccess(
      input.subDepartmentIds,
      supervisorDepartmentIds,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You can only request employees in your assigned departments',
      );
    }

    // Validate unique email
    const existingUserByEmail = await this.userRepository.findByEmail(
      input.email,
    );
    if (existingUserByEmail) {
      throw new BadRequestException('Email already exists');
    }

    // Validate unique employee ID if provided
    if (input.employeeId) {
      const existingUserByEmployeeId =
        await this.userRepository.findByEmployeeId(input.employeeId);
      if (existingUserByEmployeeId) {
        throw new BadRequestException('Employee ID already exists');
      }
    }

    // Validate departments exist
    const subDepartments = await this.departmentRepository.findByIds(
      input.subDepartmentIds,
    );

    if (subDepartments.length !== input.subDepartmentIds.length) {
      throw new BadRequestException('One or more sub-departments do not exist');
    }

    // Create invitation request token and store data in Redis
    const invitationToken = await this.invitationService.createInvitation({
      fullName: input.fullName,
      email: input.email,
      employeeId: input.employeeId,
      jobTitle: input.jobTitle,
      supervisorId: supervisor.id.toString(),
      subDepartmentIds: input.subDepartmentIds,
      permissions: input.permissions,
      status: InvitationStatus.PENDING_APPROVAL, // Needs admin approval
      requestedBy: requestingUserId,
    });

    const subDepartmentNames = subDepartments.map((dept) => dept.name);

    return {
      request: {
        token: invitationToken,
        fullName: input.fullName,
        email: input.email,
        employeeId: input.employeeId,
        jobTitle: input.jobTitle,
        supervisorId: supervisor.id.toString(),
        subDepartmentNames: subDepartmentNames,
        permissions: input.permissions,
        status: InvitationStatus.PENDING_APPROVAL,
        requestedBy: requestingUserId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      message: `Employee invitation request submitted successfully for ${input.email}. Awaiting admin approval.`,
    };
  }
}

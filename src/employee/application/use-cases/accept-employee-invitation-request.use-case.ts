import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  EmployeeInvitationService,
  InvitationStatus,
} from '../../infrastructure/services/employee-invitation.service';
import { ResendEmailService } from 'src/shared/infrastructure/email/resend-email.service';
import { InviteEmployeeEmail } from 'src/shared/infrastructure/email/InviteEmployeeEmail';
import { ConfigService } from '@nestjs/config';

interface AcceptEmployeeInvitationRequestUseCaseInput {
  token: string;
}

interface AcceptEmployeeInvitationRequestUseCaseOutput {
  message: string;
  invitationDetails: {
    token: string;
    fullName: string;
    email: string;
    jobTitle: string;
    status: string;
    approvedBy: string;
    approvedAt: Date;
  };
}

@Injectable()
export class AcceptEmployeeInvitationRequestUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly invitationService: EmployeeInvitationService,
    private readonly emailService: ResendEmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    input: AcceptEmployeeInvitationRequestUseCaseInput,
    approvingUserId: string,
  ): Promise<AcceptEmployeeInvitationRequestUseCaseOutput> {
    if (!approvingUserId) {
      throw new BadRequestException({
        details: [{ field: 'approvingUserId', message: 'User ID is required' }],
      });
    }

    const approvingUser = await this.userRepository.findById(approvingUserId);
    if (!approvingUser) {
      throw new BadRequestException({
        details: [{ field: 'approvingUserId', message: 'User not found' }],
      });
    }

    const userRole = approvingUser.role.getRole();

    // Only admins can approve employee invitation requests
    if (userRole !== Roles.ADMIN) {
      throw new ForbiddenException({
        details: [
          {
            field: 'role',
            message: 'Only admins can approve employee invitation requests',
          },
        ],
      });
    }

    // Get invitation data from Redis
    const invitationData = await this.invitationService.getInvitation(
      input.token,
    );
    if (!invitationData) {
      throw new NotFoundException({
        details: [
          { field: 'token', message: 'Invalid or expired invitation token' },
        ],
      });
    }

    // Check if invitation is pending approval
    if (invitationData.status !== InvitationStatus.PENDING_APPROVAL) {
      throw new BadRequestException({
        details: [
          { field: 'token', message: 'Invitation is not pending approval' },
        ],
      });
    }

    // Validate that the supervisor still exists
    const supervisor = await this.supervisorRepository.findById(
      invitationData.supervisorId,
    );
    if (!supervisor) {
      throw new BadRequestException({
        details: [
          { field: 'supervisorId', message: 'Supervisor no longer exists' },
        ],
      });
    }

    // Validate that sub-departments still exist
    const subDepartments = await this.departmentRepository.findByIds(
      invitationData.subDepartmentIds,
    );
    if (subDepartments.length !== invitationData.subDepartmentIds.length) {
      throw new BadRequestException({
        details: [
          {
            field: 'subDepartmentIds',
            message: 'One or more sub-departments no longer exist',
          },
        ],
      });
    }

    // Approve the invitation
    await this.invitationService.approveInvitation(
      input.token,
      approvingUserId,
    );

    // Send invitation email to the employee
    const baseUrl = this.configService.get<string>(
      'DASHBOARD_URL',
      'http://localhost:3001',
    );
    const subDepartmentNames = subDepartments.map((dept) => dept.name);

    await this.emailService.sendReactEmail(
      invitationData.email,
      'Employee Invitation - Complete Your Profile Setup',
      InviteEmployeeEmail,
      {
        name: invitationData.fullName,
        token: input.token,
        baseUrl: `${baseUrl}/register/employee`,
        jobTitle: invitationData.jobTitle,
        subDepartmentNames,
      },
    );

    return {
      message: `Employee invitation request approved successfully. Invitation email sent to ${invitationData.email}.`,
      invitationDetails: {
        token: input.token,
        fullName: invitationData.fullName,
        email: invitationData.email,
        jobTitle: invitationData.jobTitle,
        status: InvitationStatus.APPROVED,
        approvedBy: approvingUserId,
        approvedAt: new Date(),
      },
    };
  }
}

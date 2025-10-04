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
import { EmployeeInvitationService } from '../../infrastructure/services/employee-invitation.service';
import { ResendEmailService } from 'src/shared/infrastructure/email/resend-email.service';
import { InviteEmployeeEmail } from 'src/shared/infrastructure/email/InviteEmployeeEmail';
import { ConfigService } from '@nestjs/config';

interface CreateEmployeeDirectUseCaseInput {
  email: string;
  fullName: string;
  jobTitle: string;
  employeeId?: string;
  permissions: EmployeePermissionsEnum[];
  subDepartmentIds: string[];
}

export interface EmployeeInvitationStatus {
  token: string;
  fullName: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  subDepartmentNames: string[];
  permissions: EmployeePermissionsEnum[];
  status: string;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

interface CreateEmployeeDirectUseCaseOutput {
  invitation: EmployeeInvitationStatus;
  message: string;
}

@Injectable()
export class CreateEmployeeDirectUseCase {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly invitationService: EmployeeInvitationService,
    private readonly emailService: ResendEmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    input: CreateEmployeeDirectUseCaseInput,
    requestingUserId?: string,
  ): Promise<CreateEmployeeDirectUseCaseOutput> {
    // Apply department access control for supervisors
    if (!requestingUserId) {
      throw new BadRequestException('User ID Is Required');
    }
    const user = await this.userRepository.findById(requestingUserId);

    if (!user) {
      throw new BadRequestException('User Not found');
    }

    const userRole = user.role.getRole();

    if (userRole === Roles.SUPERVISOR) {
      const supervisor =
        await this.supervisorRepository.findByUserId(requestingUserId);
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Check if supervisor can assign employees to the requested sub-departments
      const hasAccess = input.subDepartmentIds.every((subDeptId) =>
        supervisorDepartmentIds.includes(subDeptId),
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only create employees in your assigned departments',
        );
      }
    }
    // Admins have full access (no restrictions)

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

    // Validate supervisor exists
    const supervisor =
      await this.supervisorRepository.findByUserId(requestingUserId);
    if (!supervisor) {
      throw new BadRequestException('Supervisor does not exist');
    }

    // Create invitation token and store data in Redis
    const invitationToken = await this.invitationService.createInvitation({
      fullName: input.fullName,
      email: input.email,
      employeeId: input.employeeId,
      jobTitle: input.jobTitle,
      supervisorId: supervisor.id.toString(),
      subDepartmentIds: input.subDepartmentIds,
      permissions: input.permissions,
    });

    // Send invitation email
    const baseUrl = this.configService.get<string>(
      'DASHBOARD_URL',
      'http://localhost:3001',
    );
    const subDepartmentNames = subDepartments.map((dept) => dept.name);

    await this.emailService.sendReactEmail(
      input.email,
      'Employee Invitation - Complete Your Profile Setup',
      InviteEmployeeEmail,
      {
        name: input.fullName,
        token: invitationToken,
        baseUrl: `${baseUrl}/register/employee`,
        jobTitle: input.jobTitle,
        subDepartmentNames,
      },
    );

    return {
      invitation: {
        token: invitationToken,
        fullName: input.fullName,
        email: input.email,
        employeeId: input.employeeId,
        jobTitle: input.jobTitle,
        subDepartmentNames: subDepartmentNames,
        permissions: input.permissions,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completedAt: undefined,
      },
      message: `Invitation sent successfully to ${input.email}. The invitation will expire in 7 days.`,
    };
  }
}

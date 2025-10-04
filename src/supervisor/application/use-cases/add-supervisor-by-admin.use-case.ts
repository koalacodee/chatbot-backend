import { Injectable, BadRequestException } from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { SupervisorPermissionsEnum } from '../../domain/entities/supervisor.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorInvitationService } from '../../infrastructure/services/supervisor-invitation.service';
import { ResendEmailService } from 'src/shared/infrastructure/email/resend-email.service';
import { InviteSupervisorEmail } from 'src/shared/infrastructure/email/InviteSupervisorEmail';
import { ConfigService } from '@nestjs/config';
import { SupervisorInvitationStatus } from './get-supervisor-invitations.use-case';

export interface AddSupervisorByAdminRequest {
  name: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  departmentIds: string[];
  permissions: SupervisorPermissionsEnum[];
}

interface AddSupervisorByAdminResponse {
  invitation: SupervisorInvitationStatus;
  message: string;
}

@Injectable()
export class AddSupervisorByAdminUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly invitationService: SupervisorInvitationService,
    private readonly emailService: ResendEmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    request: AddSupervisorByAdminRequest,
  ): Promise<AddSupervisorByAdminResponse> {
    // Validate unique email
    const existingUserByEmail = await this.userRepository.findByEmail(
      request.email,
    );
    if (existingUserByEmail) {
      throw new BadRequestException('Email already exists');
    }

    // Validate unique employee ID if provided
    if (request.employeeId) {
      const existingUserByEmployeeId =
        await this.userRepository.findByEmployeeId(request.employeeId);
      if (existingUserByEmployeeId) {
        throw new BadRequestException('Employee ID already exists');
      }
    }

    // Validate departments exist
    const departments = await this.departmentRepository.findByIds(
      request.departmentIds,
    );

    if (departments.length !== request.departmentIds.length) {
      throw new BadRequestException('One or more departments do not exist');
    }

    // Create invitation token and store data in Redis
    const invitationToken = await this.invitationService.createInvitation({
      name: request.name,
      email: request.email,
      employeeId: request.employeeId,
      jobTitle: request.jobTitle,
      departmentIds: request.departmentIds,
      permissions: request.permissions,
    });

    // Send invitation email
    const baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const departmentNames = departments.map((dept) => dept.name);

    await this.emailService.sendReactEmail(
      request.email,
      'Supervisor Invitation - Complete Your Profile Setup',
      InviteSupervisorEmail,
      {
        name: request.name,
        token: invitationToken,
        baseUrl: `${baseUrl}/register/supervisor`,
        jobTitle: request.jobTitle,
        departmentNames,
      },
    );

    return {
      invitation: {
        token: invitationToken,
        name: request.name,
        email: request.email,
        employeeId: request.employeeId,
        jobTitle: request.jobTitle,
        departmentNames: departmentNames,
        permissions: request.permissions,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completedAt: undefined,
      },
      message: `Invitation sent successfully to ${request.email}. The invitation will expire in 7 days.`,
    };
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { User } from 'src/shared/entities/user.entity';
import { Supervisor } from '../../domain/entities/supervisor.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorInvitationService } from '../../infrastructure/services/supervisor-invitation.service';
import { GenerateProfilePictureUploadKeyUseCase } from 'src/profile/application/use-cases/generate-profile-picture-upload-key.use-case';
import { TokensService } from 'src/auth/domain/services/tokens.service';

export interface CompleteSupervisorInvitationRequest {
  token: string;
  username: string;
  name: string;
  password: string;
  uploadProfilePicture?: boolean;
}

interface CompleteSupervisorInvitationResponse {
  supervisor: Supervisor;
  user: User;
  accessToken: string;
  refreshToken: string;
  uploadKey?: string;
  uploadKeyExpiresAt?: Date;
}

@Injectable()
export class CompleteSupervisorInvitationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly invitationService: SupervisorInvitationService,
    private readonly generateUploadKeyUseCase: GenerateProfilePictureUploadKeyUseCase,
    private readonly tokensService: TokensService,
  ) {}

  async execute(
    request: CompleteSupervisorInvitationRequest,
  ): Promise<CompleteSupervisorInvitationResponse> {
    // Get invitation data from Redis
    const invitationData = await this.invitationService.getInvitation(
      request.token,
    );
    if (!invitationData) {
      throw new NotFoundException({
        details: [
          { field: 'token', message: 'Invalid or expired invitation token' },
        ],
      });
    }

    // Validate unique username
    const existingUserByUsername = await this.userRepository.findByUsername(
      request.username,
    );
    if (existingUserByUsername) {
      throw new BadRequestException({
        details: [{ field: 'username', message: 'Username already exists' }],
      });
    }

    // Validate unique email (should not happen since we checked during invitation creation)
    const existingUserByEmail = await this.userRepository.findByEmail(
      invitationData.email,
    );
    if (existingUserByEmail) {
      throw new BadRequestException({
        details: [{ field: 'email', message: 'Email already exists' }],
      });
    }

    // Validate unique employee ID if provided
    if (invitationData.employeeId) {
      const existingUserByEmployeeId =
        await this.userRepository.findByEmployeeId(invitationData.employeeId);
      if (existingUserByEmployeeId) {
        throw new BadRequestException({
          details: [
            { field: 'employeeId', message: 'Employee ID already exists' },
          ],
        });
      }
    }

    // Get departments
    const departments = await this.departmentRepository.findByIds(
      invitationData.departmentIds,
    );

    if (departments.length !== invitationData.departmentIds.length) {
      throw new BadRequestException({
        details: [
          {
            field: 'departmentIds',
            message: 'One or more departments no longer exist',
          },
        ],
      });
    }

    // Create new user
    const newUser = await User.create(
      {
        name: request.name,
        email: invitationData.email,
        username: request.username,
        password: request.password,
        role: Roles.SUPERVISOR,
        employeeId: invitationData.employeeId,
        jobTitle: invitationData.jobTitle,
      },
      true,
    );

    const savedUser = await this.userRepository.save(newUser);

    // Create new supervisor
    const supervisor = Supervisor.create({
      id: uuidv7(),
      userId: savedUser.id,
      permissions: invitationData.permissions,
      departments,
      assignedTasks: [],
      employeeRequests: [],
      promotions: [],
      approvedTasks: [],
      questions: [],
      supportTicketAnswersAuthored: [],
      performedTasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedSupervisor = await this.supervisorRepository.save(supervisor);

    // Delete the invitation token from Redis
    await this.invitationService.deleteInvitation(request.token);

    // Generate JWT tokens for the new supervisor
    const tokens = await this.tokensService.generateTokens(
      savedUser.id,
      savedUser.email.getValue(),
      savedUser.role.getRole(),
      savedSupervisor.permissions,
    );

    // Generate upload key if profile picture upload is requested
    let uploadKey: string | undefined;
    let uploadKeyExpiresAt: Date | undefined;

    if (request.uploadProfilePicture) {
      const uploadKeyResult = await this.generateUploadKeyUseCase.execute({
        userId: savedUser.id,
      });
      uploadKey = uploadKeyResult.uploadKey;
      uploadKeyExpiresAt = uploadKeyResult.expiresAt;
    }

    return {
      supervisor: savedSupervisor,
      user: savedUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      uploadKey,
      uploadKeyExpiresAt,
    };
  }
}

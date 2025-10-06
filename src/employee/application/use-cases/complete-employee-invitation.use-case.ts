import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { User } from 'src/shared/entities/user.entity';
import { Employee } from '../../domain/entities/employee.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  EmployeeInvitationService,
  InvitationStatus,
} from '../../infrastructure/services/employee-invitation.service';
import { GenerateProfilePictureUploadKeyUseCase } from 'src/profile/application/use-cases/generate-profile-picture-upload-key.use-case';
import { TokensService } from 'src/auth/domain/services/tokens.service';

export interface CompleteEmployeeInvitationRequest {
  token: string;
  username: string;
  name: string;
  password: string;
  uploadProfilePicture?: boolean;
}

interface CompleteEmployeeInvitationResponse {
  employee: Employee;
  user: User;
  accessToken: string;
  refreshToken: string;
  uploadKey?: string;
  uploadKeyExpiresAt?: Date;
}

@Injectable()
export class CompleteEmployeeInvitationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly invitationService: EmployeeInvitationService,
    private readonly generateUploadKeyUseCase: GenerateProfilePictureUploadKeyUseCase,
    private readonly tokensService: TokensService,
  ) {}

  async execute(
    request: CompleteEmployeeInvitationRequest,
  ): Promise<CompleteEmployeeInvitationResponse> {
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

    // Check if invitation is approved
    if (invitationData.status !== InvitationStatus.APPROVED) {
      throw new BadRequestException({
        details: [{ field: 'root', message: 'Invitation is not approved yet' }],
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

    // Get sub-departments
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

    // Validate supervisor still exists
    const supervisor = await this.supervisorRepository.findById(
      invitationData.supervisorId,
    );
    if (!supervisor) {
      throw new BadRequestException({
        details: [
          { field: 'supervisor', message: 'Supervisor no longer exists' },
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
        role: Roles.EMPLOYEE,
        employeeId: invitationData.employeeId,
        jobTitle: invitationData.jobTitle,
      },
      true,
    );

    const savedUser = await this.userRepository.save(newUser);

    // Create new employee
    const employee = await Employee.create({
      id: uuidv7(),
      userId: savedUser.id,
      permissions: invitationData.permissions,
      supervisorId: invitationData.supervisorId,
      subDepartments,
      user: savedUser,
    });

    const savedEmployee = await this.employeeRepository.save(employee);

    // Delete the invitation token from Redis
    await this.invitationService.deleteInvitation(request.token);

    // Generate JWT tokens for the new employee
    const tokens = await this.tokensService.generateTokens(
      savedUser.id,
      savedUser.email.getValue(),
      savedUser.role.getRole(),
      savedEmployee.permissions,
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
      employee: savedEmployee,
      user: savedUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      uploadKey,
      uploadKeyExpiresAt,
    };
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { User } from 'src/shared/entities/user.entity';
import { Supervisor } from '../../domain/entities/supervisor.entity';
import { SupervisorPermissions } from '../../domain/entities/supervisor.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

export interface AddSupervisorByAdminRequest {
  name: string;
  email: string;
  username: string;
  password: string;
  employeeId?: string;
  jobTitle: string;
  departmentIds: string[];
  permissions: SupervisorPermissions[];
}

interface AddSupervisorByAdminResponse {
  supervisor: Supervisor;
  user: User;
}

@Injectable()
export class AddSupervisorByAdminUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(
    request: AddSupervisorByAdminRequest,
  ): Promise<AddSupervisorByAdminResponse> {
    // Validate unique username
    const existingUserByUsername = await this.userRepository.findByUsername(
      request.username,
    );
    if (existingUserByUsername) {
      throw new BadRequestException('Username already exists');
    }

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

    // Create new user
    const newUser = await User.create(
      {
        name: request.name,
        email: request.email,
        username: request.username,
        password: request.password,
        role: Roles.SUPERVISOR,
        employeeId: request.employeeId,
        jobTitle: request.jobTitle,
      },
      true,
    );

    const savedUser = await this.userRepository.save(newUser);

    // Create new supervisor
    const supervisor = Supervisor.create({
      id: uuidv7(),
      userId: savedUser.id,
      permissions: request.permissions,
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

    return {
      supervisor: savedSupervisor,
      user: savedUser,
    };
  }
}

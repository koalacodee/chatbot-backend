import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import {
  EmployeeRequest,
  RequestStatus,
} from '../../domain/entities/employee-request.entity';
import { User } from 'src/shared/entities/user.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { StaffRequestResolvedEvent } from '../../domain/events/staff-request-resolved.event';

export interface ApproveEmployeeRequestDto {
  employeeRequestId: string;
  approvedAdminUserID: string;
}

@Injectable()
export class ApproveEmployeeRequestUseCase {
  // EmployeeRepository and SupervisorRepository are gone: the employee write moved into
  // the transactional approval, and the supervisor's userId is already hydrated on the
  // request, so the extra lookup it was fetched for is unnecessary.
  constructor(
    private readonly employeeRequestRepository: EmployeeRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly adminRepository: AdminRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ApproveEmployeeRequestDto): Promise<{
    employeeRequest: EmployeeRequest;
    newUser: User;
    newEmployee: Employee;
  }> {
    const employeeRequest = await this.employeeRequestRepository.findById(
      dto.employeeRequestId,
    );

    if (!employeeRequest) {
      console.error(
        `[ApproveEmployeeRequestUseCase] Employee request not found: ${dto.employeeRequestId}`,
      );
      throw new NotFoundException({
        details: [
          { field: 'employeeRequestId', message: 'Employee request not found' },
        ],
      });
    }

    if (employeeRequest.status !== RequestStatus.PENDING) {
      console.warn(
        `[ApproveEmployeeRequestUseCase] Employee request is not pending. Current status: ${employeeRequest.status}`,
      );
      throw new BadRequestException({
        details: [
          {
            field: 'employeeRequestId',
            message: 'Employee request is not pending',
          },
        ],
      });
    }

    // Resolved after the request is validated, and guarded — previously this was fetched
    // up front and used without a null check, so approving with an unknown admin id
    // succeeded and recorded no resolver.
    const admin = await this.adminRepository.findByUserId(
      dto.approvedAdminUserID,
    );

    if (!admin) {
      throw new NotFoundException({
        details: [{ field: 'approvedAdminUserID', message: 'Admin not found' }],
      });
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(
      employeeRequest.newEmployeeEmail.toString(),
    );
    if (existingUser) {
      console.warn(
        `[ApproveEmployeeRequestUseCase] Email already exists: ${employeeRequest.newEmployeeEmail.toString()}`,
      );
      throw new BadRequestException({
        details: [
          { field: 'newEmployeeEmail', message: 'Email already exists' },
        ],
      });
    }

    // Check if username already exists
    const existingUserByUsername = await this.userRepository.findByUsername(
      employeeRequest.newEmployeeUsername,
    );
    if (existingUserByUsername) {
      console.warn(
        `[ApproveEmployeeRequestUseCase] Username already exists: ${employeeRequest.newEmployeeUsername}`,
      );
      throw new BadRequestException({
        details: [
          { field: 'newEmployeeUsername', message: 'Username already exists' },
        ],
      });
    }

    const newUser = await User.create({
      name: employeeRequest.newEmployeeFullName,
      email: employeeRequest.newEmployeeEmail.toString(),
      username: employeeRequest.newEmployeeUsername,
      password: employeeRequest.temporaryPassword,
      role: Roles.EMPLOYEE,
      jobTitle: employeeRequest.newEmployeeJobTitle,
      employeeId: employeeRequest.newEmployeeId,
    });

    const newEmployee = await Employee.create({
      userId: newUser.id,
      supervisorId: employeeRequest.requestedBySupervisor.id.toString(),
      permissions: [],
      subDepartments: [],
      user: newUser,
    });

    employeeRequest.status = RequestStatus.APPROVED;
    employeeRequest.resolvedByAdmin = admin;
    employeeRequest.resolvedAt = new Date();

    // One transaction for all three writes. Previously these were three independent
    // saves, so a failure partway committed the earlier ones — leaving an orphan user
    // holding the email and username, and a request stuck at PENDING that could never be
    // approved again because those checks would now find the orphan.
    const { request: updatedRequest, user: savedUser, employee: savedEmployee } =
      await this.employeeRequestRepository.approveTransactionally({
        request: employeeRequest,
        user: newUser,
        employee: newEmployee,
      });

    // The resolver treats this field as a USER id, so the supervisor's userId belongs
    // here rather than the supervisor row id. findById already hydrates it.
    this.eventEmitter.emit(
      StaffRequestResolvedEvent.name,
      new StaffRequestResolvedEvent(
        updatedRequest.id.toString(),
        updatedRequest.newEmployeeUsername,
        updatedRequest.requestedBySupervisor.userId.toString(),
        'approved',
        new Date(),
      ),
    );

    return {
      employeeRequest: updatedRequest,
      newUser: savedUser,
      newEmployee: savedEmployee,
    };
  }
}

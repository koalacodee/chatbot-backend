import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import {
  EmployeeRequest,
  RequestStatus,
} from '../../domain/entities/employee-request.entity';
import { User } from 'src/shared/entities/user.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';

export interface ApproveEmployeeRequestDto {
  employeeRequestId: string;
  approvedAdminUserID: string;
}

@Injectable()
export class ApproveEmployeeRequestUseCase {
  constructor(
    private readonly employeeRequestRepository: EmployeeRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly adminRepository: AdminRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async execute(dto: ApproveEmployeeRequestDto): Promise<{
    employeeRequest: EmployeeRequest;
    newUser: User;
    newEmployee: Employee;
  }> {
    const employeeRequest = await this.employeeRequestRepository.findById(
      dto.employeeRequestId,
    );
    const admin = await this.adminRepository.findByUserId(
      dto.approvedAdminUserID,
    );

    if (!employeeRequest) {
      console.error(
        `[ApproveEmployeeRequestUseCase] Employee request not found: ${dto.employeeRequestId}`,
      );
      throw new NotFoundException('Employee request not found');
    }

    if (employeeRequest.status !== 'PENDING') {
      console.warn(
        `[ApproveEmployeeRequestUseCase] Employee request is not pending. Current status: ${employeeRequest.status}`,
      );
      throw new BadRequestException('Employee request is not pending');
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(
      employeeRequest.newEmployeeEmail.toString(),
    );
    if (existingUser) {
      console.warn(
        `[ApproveEmployeeRequestUseCase] Email already exists: ${employeeRequest.newEmployeeEmail.toString()}`,
      );
      throw new BadRequestException('Email already exists');
    }

    // Check if username already exists
    const existingUserByUsername = await this.userRepository.findByUsername(
      employeeRequest.newEmployeeUsername,
    );
    if (existingUserByUsername) {
      console.warn(
        `[ApproveEmployeeRequestUseCase] Username already exists: ${employeeRequest.newEmployeeUsername}`,
      );
      throw new BadRequestException('Username already exists');
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

    const savedUser = await this.userRepository.save(newUser);
    const newEmployee = await Employee.create({
      userId: savedUser.id,
      supervisorId: employeeRequest.requestedBySupervisor.id.toString(),
      permissions: [],
      subDepartments: [],
      user: newUser,
    });

    const savedEmployee = await this.employeeRepository.save(newEmployee);

    // Update employee request status
    employeeRequest.status = RequestStatus.APPROVED;
    employeeRequest.resolvedByAdmin = admin;
    employeeRequest.resolvedAt = new Date();
    const updatedRequest =
      await this.employeeRequestRepository.save(employeeRequest);

    return {
      employeeRequest: updatedRequest,
      newUser: savedUser,
      newEmployee: savedEmployee,
    };
  }
}

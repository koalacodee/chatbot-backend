import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskStatus } from '../../domain/entities/task.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface MarkDelegationSeenInputDto {
  delegationId: string;
}

@Injectable()
export class MarkDelegationSeenUseCase {
  constructor(
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) { }

  async execute(
    dto: MarkDelegationSeenInputDto,
    userId?: string,
  ): Promise<TaskDelegation> {
    const existing = await this.taskDelegationRepository.findById(
      dto.delegationId,
    );
    if (!existing)
      throw new NotFoundException({ id: 'delegation_not_found' });

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      await this.checkDelegationAccess(userId, existing, userRole);
    }

    existing.status = TaskStatus.SEEN;
    return this.taskDelegationRepository.save(existing);
  }

  private async checkDelegationAccess(
    userId: string,
    delegation: TaskDelegation,
    role: Roles,
  ): Promise<void> {
    let hasAccess = false;

    if (role === Roles.ADMIN) {
      hasAccess = true; // Admins have access to all delegations
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Check if delegation targets supervisor's departments or is delegated by them
      const targetSubDepartmentId = delegation.targetSubDepartmentId;
      const isDelegatedBySupervisor =
        delegation.delegatorId === supervisor.id.toString();

      hasAccess =
        isDelegatedBySupervisor ||
        (targetSubDepartmentId &&
          supervisorDepartmentIds.includes(targetSubDepartmentId));
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const employeeDepartmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];

      // Check if delegation targets employee's departments or is assigned to them
      const targetSubDepartmentId = delegation.targetSubDepartmentId;
      const isAssignedToEmployee =
        delegation.assigneeId === employee?.id.toString();

      hasAccess =
        isAssignedToEmployee ||
        (targetSubDepartmentId &&
          employeeDepartmentIds.includes(targetSubDepartmentId));
    }

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to mark this delegation as seen',
      );
    }
  }
}


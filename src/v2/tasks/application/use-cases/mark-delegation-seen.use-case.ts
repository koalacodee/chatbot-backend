import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskStatus } from '../../domain/entities/task.entity';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { Roles } from '@/shared/value-objects/role.vo';

interface MarkDelegationSeenInputDto {
  delegationId: string;
}

@Injectable()
export class MarkDelegationSeenUseCase {
  constructor(
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly userRepo: UserRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) {}

  async execute(
    dto: MarkDelegationSeenInputDto,
    userId?: string,
  ): Promise<{
    delegation: ReturnType<typeof TaskDelegation.prototype.toJSON>;
  }> {
    const existing = await this.taskDelegationRepo.findById(dto.delegationId);
    if (!existing) throw new NotFoundException({ id: 'delegation_not_found' });

    // Skip if Delegation is already "SEEN" for performance

    if (existing.status === TaskStatus.SEEN) {
      return { delegation: existing.toJSON() };
    }

    // Validate access if userId is provided
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.validateAccess(userId, existing, userRole);
    }

    existing.status = TaskStatus.SEEN;
    const savedDelegation = await this.taskDelegationRepo.save(existing);

    return { delegation: savedDelegation.toJSON() };
  }

  private async validateAccess(
    userId: string,
    delegation: TaskDelegation,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) return;

    if (role === Roles.SUPERVISOR) {
      // Check if user is the delegator
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const isDelegator = delegation.delegatorId === supervisor.id.toString();
      if (isDelegator) return;

      // Check for hierarchical access to the delegation's sub-department
      if (delegation.targetSubDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: userId },
            delegation.targetSubDepartmentId,
          );
        if (hasAccess) return;
      }
    } else if (role === Roles.EMPLOYEE) {
      const isAssigned = delegation.assigneeId === userId;
      if (isAssigned) return;

      if (delegation.targetSubDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.employeeHasAccessToSubDepartment(
            { employeeUserId: userId },
            delegation.targetSubDepartmentId,
          );
        if (hasAccess) return;
      }
    }

    throw new ForbiddenException(
      'You do not have access to mark this delegation as seen',
    );
  }
}

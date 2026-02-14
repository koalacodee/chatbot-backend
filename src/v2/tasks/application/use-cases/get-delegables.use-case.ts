import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  Delegable,
  TaskDelegationRepository,
} from '../../domain/repositories/task-delegation.repository';
import { Roles } from '@/shared/value-objects/role.vo';

@Injectable()
export class GetDelegablesUseCase {
  constructor(private readonly taskDelegationRepo: TaskDelegationRepository) {}

  async execute(
    userId: string,
    userRole: Roles,
    search?: string,
  ): Promise<Delegable[]> {
    if (userRole !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        id: 'get_delegables_forbidden',
        message: 'Only supervisors can get delegables',
      });
    }

    return this.taskDelegationRepo.findDelegablesForSupervisor(
      {
        supervisorUserId: userId,
        supervisorId: undefined as never,
      },
      search,
    );
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { Roles } from '@/shared/value-objects/role.vo';

@Injectable()
export class UpdateDelegationUseCase {
  constructor(
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) {}

  async execute(
    delegationId: string,
    userId: string,
    updates: {
      status?: string;
    },
  ): Promise<void> {
    const delegation = await this.taskDelegationRepo.findById(delegationId);
    if (!delegation) {
      throw new NotFoundException({ delegationId: 'not_found' });
    }

    // Validate access - only the delegator can update
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    if (userRole !== Roles.ADMIN) {
      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        if (delegation.delegatorId !== supervisor.id.toString()) {
          throw new ForbiddenException(
            'You do not have permission to update this delegation',
          );
        }
      } else {
        throw new ForbiddenException('Only supervisors can update delegations');
      }
    }

    if (updates.status !== undefined) {
      delegation.status = updates.status as any;
    }

    await this.taskDelegationRepo.update(delegation.id, delegation);
  }
}

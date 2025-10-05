import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupervisorRepository } from '../../domain/repository/supervisor.repository';

interface DelegateSupervisorRequest {
  fromSupervisorUserId: string;
  toSupervisorUserId: string;
}

@Injectable()
export class DelegateSupervisorUseCase {
  constructor(private readonly supervisorRepository: SupervisorRepository) {}

  async execute(request: DelegateSupervisorRequest): Promise<void> {
    const { fromSupervisorUserId, toSupervisorUserId } = request;

    // Validate that both supervisors exist
    const fromSupervisor =
      await this.supervisorRepository.findByUserId(fromSupervisorUserId);
    if (!fromSupervisor) {
      throw new NotFoundException(
        `Supervisor with ID ${fromSupervisorUserId} not found`,
      );
    }

    const toSupervisor =
      await this.supervisorRepository.findByUserId(toSupervisorUserId);
    if (!toSupervisor) {
      throw new NotFoundException(
        `Supervisor with ID ${toSupervisorUserId} not found`,
      );
    }

    // Prevent self-delegation
    if (fromSupervisorUserId === toSupervisorUserId) {
      throw new BadRequestException(
        'Cannot delegate responsibilities to the same supervisor',
      );
    }

    // Delegate all responsibilities to the new supervisor
    await this.supervisorRepository.delegateSupervisorResponsibilities(
      fromSupervisor.id.toString(),
      toSupervisor.id.toString(),
    );
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { SupervisorRepository } from '../../domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';

@Injectable()
export class DeleteSupervisorUseCase {
  constructor(
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const [supervisorExists, userExists] = await Promise.all([
      this.supervisorRepository.exists(id),
      this.userRepository.findBySupervisorId(id),
    ]);
    if (!supervisorExists || !userExists) {
      throw new NotFoundException({
        details: [{ field: 'id', message: 'Supervisor not found' }],
      });
    }

    await Promise.all([
      this.userRepository.delete(userExists.id),
      this.supervisorRepository.delete(id),
    ]);
  }
}

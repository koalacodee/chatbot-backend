import { Injectable, NotFoundException } from '@nestjs/common';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AddSupervisorByAdminRequest } from './add-supervisor-by-admin.use-case';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Email } from 'src/shared/value-objects/email.vo';

interface UpdateSupervisorRequest
  extends Partial<AddSupervisorByAdminRequest> {}

@Injectable()
export class UpdateSupervisorUseCase {
  constructor(
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    id: string,
    supervisor: UpdateSupervisorRequest,
  ): Promise<void> {
    const { permissions, departmentIds, password, email, ...userData } =
      supervisor;
    const user = await this.userRepository.findBySupervisorId(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.email = Email.create(email);
    password ? await user.changePassword(password) : '';
    await this.userRepository.save(Object.assign(user, userData));

    const existingSupervisor = await this.supervisorRepository.findById(id);
    if (!existingSupervisor) {
      throw new NotFoundException('Supervisor not found');
    }

    const updatedSupervisor = Object.assign(existingSupervisor, supervisor);
    await this.supervisorRepository.update(id, updatedSupervisor);
  }
}

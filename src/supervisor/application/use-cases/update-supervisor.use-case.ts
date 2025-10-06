import { Injectable, NotFoundException } from '@nestjs/common';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AddSupervisorByAdminRequest } from './add-supervisor-by-admin.use-case';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Email } from 'src/shared/value-objects/email.vo';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';

interface UpdateSupervisorRequest
  extends Partial<AddSupervisorByAdminRequest> {}

@Injectable()
export class UpdateSupervisorUseCase {
  constructor(
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(
    id: string,
    supervisor: UpdateSupervisorRequest,
  ): Promise<void> {
    const { permissions, departmentIds, email, ...userData } = supervisor;
    const user = await this.userRepository.findBySupervisorId(id);
    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'id', message: 'User not found' }],
      });
    }
    user.email = Email.create(email);
    await this.userRepository.save(Object.assign(user, userData));

    const existingSupervisor = await this.supervisorRepository.findById(id);
    if (!existingSupervisor) {
      throw new NotFoundException({
        details: [{ field: 'id', message: 'Supervisor not found' }],
      });
    }

    if (
      supervisor.departmentIds !==
      existingSupervisor.departments.map(({ id }) => id.toString())
    ) {
      const departments = await this.departmentRepository.findByIds(
        supervisor.departmentIds,
      );
      existingSupervisor.departments = departments;
    }

    const updatedSupervisor = Object.assign(existingSupervisor, supervisor);
    await this.supervisorRepository.update(id, updatedSupervisor);
  }
}

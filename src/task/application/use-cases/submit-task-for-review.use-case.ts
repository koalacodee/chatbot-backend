import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Task, TaskStatus } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { User } from 'src/shared/entities/user.entity';

interface SubmitTaskForReviewInputDto {
  taskId: string;
  submittedBy: string;
  notes?: string; // optional notes to store on the task (assigner notes per schema)
  // Attachments would be handled via dedicated Attachment use cases/repos; omitted here by design.
}

@Injectable()
export class SubmitTaskForReviewUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  async getSubmitterByUser(user: User) {
    switch (user.role.getRole()) {
      case Roles.ADMIN:
        return this.adminRepository.findByUserId(user.id);
      case Roles.SUPERVISOR:
        return this.supervisorRepository.findByUserId(user.id);
      case Roles.EMPLOYEE:
        return this.employeeRepository.findByUserId(user.id);
      default:
        return null;
    }
  }

  async execute(dto: SubmitTaskForReviewInputDto): Promise<Task> {
    const [existing, submitter] = await Promise.all([
      this.taskRepo.findById(dto.taskId),
      this.userRepo.findById(dto.submittedBy).then(user => this.getSubmitterByUser(user))
,
    ]);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });
    if (!submitter) throw new NotFoundException({ submittedBy: 'not_found' });

    // Update notes if provided
    if (dto.notes !== undefined) existing.notes = dto.notes;

    existing.performer = submitter;

    // Update status according to role
    if (submitter instanceof Employee) {
      existing.status = TaskStatus.PENDING_REVIEW;
    } else if (submitter instanceof Supervisor) {
      existing.status = TaskStatus.PENDING_SUPERVISOR_REVIEW;
    } else {
      existing.status = TaskStatus.COMPLETED;
    }

    return this.taskRepo.save(existing);
  }
}

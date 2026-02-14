import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../domain/entities/task-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from '@/admin/domain/repositories/admin.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import {
  TaskStatus,
  TaskAssignmentType,
  Task,
} from '../../domain/entities/task.entity';
import { Admin } from '@/admin/domain/entities/admin.entity';
import { Supervisor } from '@/supervisor/domain/entities/supervisor.entity';
import { TaskRejectedEvent } from '../../domain/events/task-rejected.event';

@Injectable()
export class RejectTaskSubmissionUseCase {
  constructor(
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    submissionId: string,
    userId: string,
    reason?: string,
  ): Promise<ReturnType<typeof TaskSubmission.prototype.toJSON>> {
    const submission = await this.taskSubmissionRepo.findById(submissionId);
    if (!submission) {
      throw new NotFoundException({ submissionId: 'not_found' });
    }

    if (submission.status !== TaskSubmissionStatus.SUBMITTED) {
      throw new BadRequestException(
        'Submission must be in SUBMITTED status to reject',
      );
    }

    console.log('taskId', submission.taskId);

    const task = await this.taskRepo.findById(submission.taskId);
    // Validate rejection rights
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();
    const reviewer = await this.validateRejectionRights(userId, task, userRole);

    // Reject submission
    submission.reject(reviewer, reason);

    // Update task
    task.status = TaskStatus.TODO;

    await Promise.all([
      this.taskSubmissionRepo.save(submission),
      this.taskRepo.save(task),
      this.eventEmitter.emitAsync(
        'task.rejected',
        new TaskRejectedEvent(
          task.id,
          task.title,
          task.assigneeId,
          submission.performerId,
          new Date(),
          reason,
        ),
      ),
    ]);

    return submission.toJSON();
  }

  private async validateRejectionRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | Admin> {
    if (role === Roles.ADMIN) {
      return this.adminRepository.findByUserId(userId);
    }

    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);

      if (task.assignmentType === TaskAssignmentType.DEPARTMENT) {
        throw new ForbiddenException(
          'Only admins can reject department-level tasks',
        );
      }

      if (task.assignmentType === TaskAssignmentType.SUB_DEPARTMENT) {
        if (task.targetSubDepartmentId) {
          const { hasAccess } =
            await this.departmentRepo.supervisorHasAccessToDepartment(
              { supervisorUserId: userId },
              task.targetSubDepartmentId,
            );
          if (!hasAccess) {
            throw new ForbiddenException(
              'You do not have permission to reject this task',
            );
          }
        }
      } else if (task.assignmentType === TaskAssignmentType.INDIVIDUAL) {
        if (task.assigneeId) {
          const hasAccess =
            await this.employeeRepository.supervisorHasAccessToEmployee({
              supervisor: { supervisorUserId: userId },
              employee: { employeeId: task.assigneeId },
            });
          if (!hasAccess) {
            throw new ForbiddenException(
              'You do not have permission to reject this task',
            );
          }
        }
      }

      return supervisor;
    }

    throw new ForbiddenException(
      'Only admins and supervisors can reject task submissions',
    );
  }
}

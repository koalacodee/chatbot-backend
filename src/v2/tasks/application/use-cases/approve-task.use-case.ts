import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskSubmissionStatus } from '../../domain/entities/task-submission.entity';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import {
  TaskStatus,
  TaskAssignmentType,
  Task,
} from '../../domain/entities/task.entity';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { TaskApprovedEvent } from '../../domain/events/task-approved.event';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from '@/admin/domain/repositories/admin.repository';

@Injectable()
export class ApproveTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly supervisorRepo: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    taskId: string,
    userId: string,
    feedback?: string,
  ): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException({ taskId: 'not_found' });
    }

    if (task.status !== TaskStatus.PENDING_REVIEW) {
      throw new BadRequestException('Task must be in PENDING_REVIEW status');
    }

    // Validate approval rights
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();
    await this.validateApprovalRights(userId, task, userRole);

    // Update task
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();

    // Batch approve submissions
    const submissions = await this.taskSubmissionRepo.findByTaskId(taskId);
    const pendingSubmissions = submissions.filter(
      (s) => s.status === TaskSubmissionStatus.SUBMITTED,
    );

    const reviewer =
      userRole === Roles.ADMIN
        ? await this.adminRepository.findByUserId(userId)
        : await this.supervisorRepo.findByUserId(userId);

    for (const submission of pendingSubmissions) {
      submission.approve(reviewer, feedback);
    }

    await Promise.all([
      this.taskRepo.save(task),
      ...pendingSubmissions.map((s) => this.taskSubmissionRepo.save(s)),
      this.eventEmitter.emitAsync(
        TaskApprovedEvent.name,
        new TaskApprovedEvent(
          task.title,
          task.id,
          userId,
          new Date(),
          userId,
          undefined, // Task level approval might not have a single performer
          task.assigneeId,
        ),
      ),
    ]);
  }

  private async validateApprovalRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) {
      return; // Admins can approve any task
    }

    if (role === Roles.SUPERVISOR) {
      if (task.assignmentType === TaskAssignmentType.DEPARTMENT) {
        throw new ForbiddenException(
          'Only admins can approve department-level tasks',
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
              'You do not have permission to approve this task',
            );
          }
        }
      } else if (task.assignmentType === TaskAssignmentType.INDIVIDUAL) {
        if (task.assigneeId) {
          const hasAccess =
            await this.employeeRepository.supervisorHasAccessToEmployee({
              supervisor: {
                supervisorUserId: userId,
              },
              employee: {
                employeeId: task.assigneeId,
              },
            });
          if (!hasAccess) {
            throw new ForbiddenException(
              'You do not have permission to approve this task',
            );
          }
        }
      }
    } else {
      throw new ForbiddenException(
        'Only admins and supervisors can approve tasks',
      );
    }
  }
}

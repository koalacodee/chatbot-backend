import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import {
  TaskAssignmentType,
  TaskStatus,
} from '../../domain/entities/task.entity';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { TaskDelegationCreatedEvent } from '../../domain/events/task-delegation-created.event';
import { TaskRemindersCreatedEvent } from '../../domain/events/task-reminders-created.event';

interface DelegateTaskInput {
  taskId: string;
  assigneeId?: string;
  targetSubDepartmentId?: string;
}

@Injectable()
export class DelegateTaskUseCase {
  constructor(
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly taskRepository: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    input: DelegateTaskInput,
    userId: string,
  ): Promise<TaskDelegation> {
    // Validate that either assigneeId or targetSubDepartmentId is provided
    if (!input.assigneeId && !input.targetSubDepartmentId) {
      throw new BadRequestException({
        details: [
          {
            field: 'assigneeId',
            message:
              'Either assigneeId or targetSubDepartmentId must be provided',
          },
        ],
      });
    }

    if (input.assigneeId && input.targetSubDepartmentId) {
      throw new BadRequestException({
        details: [
          {
            field: 'assigneeId',
            message:
              'Cannot provide both assigneeId and targetSubDepartmentId. Provide only one.',
          },
        ],
      });
    }

    // Get the user and verify they are a supervisor
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    const userRole = user.role.getRole();
    if (userRole !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        details: [
          {
            field: 'userId',
            message: 'Only supervisors can delegate tasks',
          },
        ],
      });
    }

    // Get the supervisor
    const supervisor = await this.supervisorRepository.findByUserId(userId);
    if (!supervisor) {
      throw new NotFoundException({
        details: [
          {
            field: 'userId',
            message: 'Supervisor not found for this user',
          },
        ],
      });
    }

    // Get the task
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) {
      throw new NotFoundException({
        details: [{ field: 'taskId', message: 'Task not found' }],
      });
    }

    // Determine assignment type and validate
    let assignmentType: TaskAssignmentType;
    let assigneeId: string | undefined;
    let targetSubDepartmentId: string;

    if (input.assigneeId) {
      // Individual assignment
      assignmentType = TaskAssignmentType.INDIVIDUAL;
      const hasAccess =
        await this.employeeRepository.supervisorHasAccessToEmployee({
          supervisor: {
            supervisorId: supervisor.id.toString(),
          },
          employee: {
            employeeId: input.assigneeId,
          },
        });

      if (!hasAccess) {
        throw new ForbiddenException({
          details: [
            {
              field: 'assigneeId',
              message:
                'You do not have access to delegate tasks to this employee',
            },
          ],
        });
      }
      assigneeId = input.assigneeId;
    } else if (input.targetSubDepartmentId) {
      // Sub-department assignment
      assignmentType = TaskAssignmentType.SUB_DEPARTMENT;

      // Verify supervisor has access
      const { hasAccess } =
        await this.departmentRepository.supervisorHasAccessToDepartment(
          { supervisorUserId: userId },
          input.targetSubDepartmentId,
        );

      if (!hasAccess) {
        throw new ForbiddenException({
          details: [
            {
              field: 'targetSubDepartmentId',
              message:
                'You do not have access to delegate tasks to this sub-department',
            },
          ],
        });
      }

      targetSubDepartmentId = input.targetSubDepartmentId;
    }

    // Create the task delegation
    const taskDelegation = TaskDelegation.create({
      taskId: input.taskId,
      task: task,
      assigneeId: assigneeId,
      targetSubDepartmentId: targetSubDepartmentId,
      delegator: supervisor,
      delegatorId: supervisor.id.toString(),
      status: TaskStatus.TODO,
      assignmentType: assignmentType,
    });

    // Save the task delegation
    const savedDelegation =
      await this.taskDelegationRepository.save(taskDelegation);

    // Emit events
    await this.eventEmitter.emitAsync(
      TaskDelegationCreatedEvent.name,
      new TaskDelegationCreatedEvent(
        savedDelegation.id,
        task.id,
        task.title,
        assignmentType,
        supervisor.id.toString(),
        assigneeId,
        targetSubDepartmentId,
        savedDelegation.createdAt,
      ),
    );

    if (task.reminders && task.reminders.length > 0) {
      await this.eventEmitter.emitAsync(
        TaskRemindersCreatedEvent.name,
        new TaskRemindersCreatedEvent(
          task.id,
          task.reminders.map((r) => ({
            id: r.id,
            interval: r.reminderInterval,
            dueDate: r.reminderDate,
          })),
          task.daysBeforeDeadlineReminder ?? 0,
        ),
      );
    }

    return savedDelegation;
  }
}

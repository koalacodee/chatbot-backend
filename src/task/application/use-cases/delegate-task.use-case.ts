import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskAssignmentType, TaskStatus } from '../../domain/entities/task.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { TaskDelegationCreatedEvent } from '../../domain/events/task-delegation-created.event';
import { DelegationReminderQueueService } from '../../infrastructure/queues/delegation-reminder.queue';

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
    private readonly delegationReminderQueueService: DelegationReminderQueueService,
  ) { }

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
    let assignee: Employee | undefined;
    let targetSubDepartment: Department;
    let assigneeId: string | undefined;
    let targetSubDepartmentId: string;

    if (input.assigneeId) {
      // Individual assignment
      assignmentType = TaskAssignmentType.INDIVIDUAL;
      assignee = await this.employeeRepository.findById(input.assigneeId);
      if (!assignee) {
        throw new NotFoundException({
          details: [
            { field: 'assigneeId', message: 'Employee not found' },
          ],
        });
      }

      assigneeId = input.assigneeId;

      // Get the employee's sub-department for targetSubDepartmentId
      // Since it's an individual assignment, we need to get the employee's sub-department
      if (!assignee.subDepartments || assignee.subDepartments.length === 0) {
        throw new BadRequestException({
          details: [
            {
              field: 'assigneeId',
              message:
                'Employee must be assigned to a sub-department to delegate tasks',
            },
          ],
        });
      }

      targetSubDepartmentId = assignee.subDepartments[0].id.toString();
      targetSubDepartment = await this.departmentRepository.findById(
        targetSubDepartmentId,
      );

      if (!targetSubDepartment) {
        throw new NotFoundException({
          details: [
            {
              field: 'assigneeId',
              message: 'Employee sub-department not found',
            },
          ],
        });
      }

      // Verify the supervisor can delegate to this employee:
      // 1. Employee is directly supervised by this supervisor, OR
      // 2. Employee is in a sub-department whose parent department is supervised by this supervisor
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      const isDirectlySupervised =
        assignee.supervisorId.toString() === supervisor.id.toString();

      // Check if supervisor has access to the sub-department (through parent department)
      const hasSubDepartmentAccess =
        await this.departmentRepository.validateDepartmentAccess(
          targetSubDepartmentId,
          supervisorDepartmentIds,
        );

      if (!isDirectlySupervised && !hasSubDepartmentAccess) {
        throw new ForbiddenException({
          details: [
            {
              field: 'assigneeId',
              message:
                'You can only delegate tasks to employees you directly supervise or to employees in sub-departments whose parent department you supervise',
            },
          ],
        });
      }
    } else if (input.targetSubDepartmentId) {
      // Sub-department assignment
      assignmentType = TaskAssignmentType.SUB_DEPARTMENT;
      targetSubDepartment = await this.departmentRepository.findById(
        input.targetSubDepartmentId,
      );

      if (!targetSubDepartment) {
        throw new NotFoundException({
          details: [
            {
              field: 'targetSubDepartmentId',
              message: 'Target sub-department not found',
            },
          ],
        });
      }

      // Verify the supervisor has access to this sub-department
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Check if supervisor has access to the sub-department through parent department
      const hasAccess = await this.departmentRepository.validateDepartmentAccess(
        input.targetSubDepartmentId,
        supervisorDepartmentIds,
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
      id: UUID.create().toString(),
      taskId: input.taskId,
      task: task,
      assignee: assignee,
      assigneeId: assigneeId,
      targetSubDepartment: targetSubDepartment!,
      targetSubDepartmentId: targetSubDepartmentId,
      delegator: supervisor,
      delegatorId: supervisor.id.toString(),
      status: TaskStatus.TODO,
      assignmentType: assignmentType,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save the task delegation
    const savedDelegation = await this.taskDelegationRepository.save(
      taskDelegation,
    );

    // Emit the TaskDelegationCreatedEvent
    await this.eventEmitter.emitAsync(
      TaskDelegationCreatedEvent.name,
      new TaskDelegationCreatedEvent(
        savedDelegation.id.toString(),
        task.id.toString(),
        task.title,
        assignmentType,
        supervisor.id.toString(),
        assignee?.userId?.toString() ?? undefined,
        targetSubDepartmentId,
        savedDelegation.createdAt,
      ),
    );

    // Schedule reminder if task has reminderInterval
    if (task.reminderInterval) {
      await this.delegationReminderQueueService.scheduleReminder(
        savedDelegation.id.toString(),
        task.reminderInterval,
      );
    }

    return savedDelegation;
  }
}


import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  Task,
  TaskAssignmentType,
  TaskPriority,
} from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';

interface CreateTaskInputDto {
  title: string;
  description: string;
  dueDate?: Date;
  assigneeId?: string;
  assignerId: string;
  assignerRole: Roles;
  approverId?: string;
  status: any; // TaskStatus
  assignmentType: TaskAssignmentType;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  completedAt?: Date | null;
  notes?: string;
  priority?: TaskPriority;
  feedback?: string;
}

@Injectable()
export class CreateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(dto: CreateTaskInputDto, userId?: string): Promise<Task> {
    // Validate required fields based on assignment type
    const validationErrors: any = {};

    if (!dto.assignerId) validationErrors.assignerId = 'required';

    // Validate assignment type specific requirements
    switch (dto.assignmentType) {
      case 'INDIVIDUAL':
        if (!dto.assigneeId) validationErrors.assigneeId = 'required';
        break;
      case 'DEPARTMENT':
        if (!dto.targetDepartmentId)
          validationErrors.targetDepartmentId = 'required';
        break;
      case 'SUB_DEPARTMENT':
        if (!dto.targetSubDepartmentId)
          validationErrors.targetSubDepartmentId = 'required';
        break;
    }

    if (Object.keys(validationErrors).length > 0) {
      throw new BadRequestException(validationErrors);
    }

    // Security check: Ensure assigner is the requesting user
    if (userId && dto.assignerId !== userId) {
      throw new ForbiddenException('You can only create tasks as yourself');
    }

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.checkDepartmentAccess(userId, dto, userRole);
    }

    const [
      assignee,
      assigner,
      approverAdmin,
      approverSupervisor,
      targetDepartment,
      targetSubDepartment,
    ] = await Promise.all([
      dto.assigneeId
        ? this.employeeRepository.findById(dto.assigneeId)
        : Promise.resolve(null),
      dto.assignerRole === Roles.ADMIN
        ? this.adminRepository.findByUserId(dto.assignerId)
        : this.supervisorRepository.findByUserId(dto.assignerId),
      dto.approverId
        ? this.adminRepository.findByUserId(dto.approverId)
        : Promise.resolve(null),
      dto.approverId
        ? this.supervisorRepository.findByUserId(dto.approverId)
        : Promise.resolve(null),
      dto.targetDepartmentId
        ? this.departmentRepo.findById(dto.targetDepartmentId)
        : Promise.resolve(null),
      dto.targetSubDepartmentId
        ? this.departmentRepo.findById(dto.targetSubDepartmentId)
        : Promise.resolve(null),
    ]);

    if (dto.assigneeId && !assignee)
      throw new NotFoundException({ assigneeId: 'not_found' });
    if (!assigner) throw new NotFoundException({ assignerId: 'not_found' });
    if (dto.approverId && !approverAdmin && !approverSupervisor)
      throw new NotFoundException({ approverId: 'not_found' });
    if (dto.targetDepartmentId && !targetDepartment)
      throw new NotFoundException({ targetDepartmentId: 'not_found' });
    if (dto.targetSubDepartmentId && !targetSubDepartment)
      throw new NotFoundException({ targetSubDepartmentId: 'not_found' });

    const task = Task.create({
      id: UUID.create().toString(),
      title: dto.title,
      description: dto.description,
      dueDate: dto.dueDate,
      assignee: assignee ?? undefined,
      assigner: assigner,
      approver: approverAdmin ?? approverSupervisor,
      assignmentType: dto.assignmentType,
      targetDepartment:
        !assignee && !targetSubDepartment ? targetDepartment : undefined,
      targetSubDepartment: !assignee ? targetSubDepartment : undefined,
      status: dto.status,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      completedAt: dto.completedAt ?? undefined,
      notes: dto.notes ?? undefined,
      feedback: dto.feedback ?? undefined,
    });

    const [saved] = await Promise.all([
      this.taskRepo.save(task),
      this.notify(dto),
    ]);

    return saved;
  }

  private async checkDepartmentAccess(
    userId: string,
    dto: CreateTaskInputDto,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) {
      return; // Admins can create tasks for any department
    }

    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);

      // Supervisors cannot create department-level tasks
      if (dto.assignmentType === 'DEPARTMENT') {
        throw new ForbiddenException(
          'Supervisors can only create individual tasks and sub-department tasks',
        );
      }

      // For individual tasks, check if assignee is supervised by this supervisor
      if (dto.assignmentType === 'INDIVIDUAL' && dto.assigneeId) {
        const assignee = await this.employeeRepository.findById(dto.assigneeId);
        if (!assignee) {
          throw new NotFoundException({ assigneeId: 'not_found' });
        }

        if (assignee.supervisorId.toString() !== supervisor.id.toString()) {
          throw new ForbiddenException(
            'You can only assign tasks to employees you directly supervise',
          );
        }
      }

      // For sub-department tasks, check sub-department access through parent
      if (
        dto.assignmentType === 'SUB_DEPARTMENT' &&
        dto.targetSubDepartmentId
      ) {
        const supervisorDepartmentIds = supervisor.departments.map((d) =>
          d.id.toString(),
        );

        // Check if supervisor has access to the sub-department through parent department
        const hasAccess = await this.departmentRepo.validateDepartmentAccess(
          dto.targetSubDepartmentId,
          supervisorDepartmentIds,
        );

        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to create tasks for this sub-department',
          );
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      // Employees typically shouldn't create tasks, but if they can, limit to their own tasks
      if (dto.assignmentType === 'INDIVIDUAL' && dto.assigneeId) {
        // Employees can only assign tasks to themselves
        if (dto.assigneeId !== userId) {
          throw new ForbiddenException('You can only assign tasks to yourself');
        }
      } else {
        // Employees cannot create department-wide tasks
        throw new ForbiddenException(
          'You do not have permission to create department-wide tasks',
        );
      }
    }
  }

  private async notify(dto: CreateTaskInputDto) {
    const notification = Notification.create({
      type: 'task_created',
      title: dto.title,
    });

    if (dto.assignmentType === 'DEPARTMENT') {
      const supervisors =
        await this.supervisorRepository.findManyByDepartmentId(
          dto.targetDepartmentId,
        );

      supervisors.forEach(({ userId }) =>
        notification.addRecipient(userId.toString()),
      );
    } else if (dto.assignmentType === 'SUB_DEPARTMENT') {
      const employees = await this.employeeRepository.findBySubDepartment(
        dto.targetSubDepartmentId,
      );
      employees.forEach(({ userId }) =>
        notification.addRecipient(userId.toString()),
      );
    } else {
      const employee = await this.employeeRepository.findById(dto.assigneeId);

      notification.addRecipient(employee.userId.toString());
    }

    await this.notificationRepository.save(notification);
  }
}

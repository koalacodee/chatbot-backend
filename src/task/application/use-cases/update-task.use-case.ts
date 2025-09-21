import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Task,
  TaskStatus,
  TaskAssignmentType,
  TaskPriority,
} from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { FilesService } from 'src/files/domain/services/files.service';
import { DeleteAttachmentsByIdsUseCase } from 'src/files/application/use-cases/delete-attachments-by-ids.use-case';

interface UpdateTaskInputDto {
  title?: string;
  description?: string;
  dueDate?: Date;
  departmentId?: string;
  assigneeId?: string;
  assignerId?: string;
  approverId?: string | null;
  status?: TaskStatus; // TaskStatus
  priority?: TaskPriority;
  assignmentType?: TaskAssignmentType;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  completedAt?: Date | null;
  notes?: string | null;
  feedback?: string | null;
  attach?: boolean;
  deleteAttachments?: string[];
}

@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly filesService: FilesService,
    private readonly deleteAttachmentsUseCase: DeleteAttachmentsByIdsUseCase,
  ) {}

  async execute(
    id: string,
    dto: UpdateTaskInputDto,
    userId?: string,
  ): Promise<{ task: Task; uploadKey?: string }> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.checkTaskAccess(userId, existing, userRole);
    }

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.dueDate !== undefined) existing.dueDate = dto.dueDate;
    if (dto.priority !== undefined) existing.priority = dto.priority;

    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId === null) {
        existing.assignee = undefined;
      } else {
        const user = await this.employeeRepository.findByUserId(dto.assigneeId);
        if (!user) throw new NotFoundException({ assigneeId: 'not_found' });
        existing.assignee = user;
      }
    }

    if (dto.assignerId !== undefined) {
      const user = await this.supervisorRepository.findByUserId(dto.assignerId);
      if (!user) throw new NotFoundException({ assignerId: 'not_found' });
      existing.assigner = user;
    }

    if (dto.targetDepartmentId !== undefined) {
      if (dto.targetDepartmentId === null) {
        existing.targetDepartment = undefined;
      } else {
        const dept = await this.departmentRepo.findById(dto.targetDepartmentId);
        if (!dept)
          throw new NotFoundException({ targetDepartmentId: 'not_found' });
        existing.targetDepartment = dept;
      }
    }

    if (dto.targetSubDepartmentId !== undefined) {
      if (dto.targetSubDepartmentId === null) {
        existing.targetSubDepartment = undefined;
      } else {
        const dept = await this.departmentRepo.findById(
          dto.targetSubDepartmentId,
        );
        if (!dept)
          throw new NotFoundException({ targetSubDepartmentId: 'not_found' });
        existing.targetSubDepartment = dept;
      }
    }

    if (dto.approverId !== undefined) {
      if (dto.approverId === null) {
        existing.approver = undefined;
      } else {
        const user = await this.userRepo.findById(dto.approverId);
        if (!user) throw new NotFoundException({ approverId: 'not_found' });
        existing.approver = await this.getApproverByUser(user);
      }
    }

    if (dto.assignmentType !== undefined)
      existing.assignmentType = dto.assignmentType;
    if (dto.status !== undefined) existing.status = dto.status;
    if (dto.completedAt !== undefined)
      existing.completedAt = dto.completedAt ?? null;
    if (dto.notes !== undefined) existing.notes = dto.notes ?? undefined;
    if (dto.feedback !== undefined)
      existing.feedback = dto.feedback ?? undefined;

    // Handle attachment deletion if specified
    if (dto.deleteAttachments && dto.deleteAttachments.length > 0) {
      await this.deleteAttachmentsUseCase.execute({
        attachmentIds: dto.deleteAttachments,
      });
    }

    const [savedTask, uploadKey] = await Promise.all([
      this.taskRepo.save(existing),
      dto.attach ? this.filesService.genUploadKey(id) : undefined,
    ]);

    return { task: savedTask, uploadKey };
  }

  async getApproverByUser(user: User) {
    switch (user.role.getRole()) {
      case Roles.ADMIN:
        return this.adminRepository.findByUserId(user.id);
      case Roles.SUPERVISOR:
        return this.supervisorRepository.findByUserId(user.id);
      default:
        return null;
    }
  }

  private async checkTaskAccess(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    let hasAccess = false;

    if (role === Roles.ADMIN) {
      hasAccess = true; // Admins have access to all tasks
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );
      const allDepartments = await this.departmentRepo
        .findAllSubDepartmentsByParentIds(supervisorDepartmentIds)
        .then((subDepts) => [
          ...subDepts.map(({ id }) => id.toString()),
          ...supervisorDepartmentIds,
        ]);

      // Check if task targets supervisor's departments
      const targetDepartmentId = task.targetDepartment?.id.toString();
      const targetSubDepartmentId = task.targetSubDepartment?.id.toString();

      // For individual-level tasks, check if the supervisor is supervising the assignee
      let isSupervisingAssignee = false;
      if (task.assignmentType === 'INDIVIDUAL' && task.assignee) {
        const assigneeEmployee = await this.employeeRepository.findById(
          task.assignee.id.toString(),
        );
        if (assigneeEmployee) {
          isSupervisingAssignee =
            assigneeEmployee.supervisor.id.toString() ===
            supervisor.id.toString();
        }
      }

      hasAccess =
        isSupervisingAssignee ||
        (targetDepartmentId && allDepartments.includes(targetDepartmentId)) ||
        (targetSubDepartmentId &&
          allDepartments.includes(targetSubDepartmentId));
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const employeeDepartmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];

      // Check if task targets employee's departments or is assigned to them
      const targetDepartmentId = task.targetDepartment?.id.toString();
      const targetSubDepartmentId = task.targetSubDepartment?.id.toString();
      const isAssignedToEmployee =
        task.assignee?.id.toString() === employee?.id.toString();

      hasAccess =
        isAssignedToEmployee ||
        (targetDepartmentId &&
          employeeDepartmentIds.includes(targetDepartmentId)) ||
        (targetSubDepartmentId &&
          employeeDepartmentIds.includes(targetSubDepartmentId));
    }

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to update this task',
      );
    }
  }
}

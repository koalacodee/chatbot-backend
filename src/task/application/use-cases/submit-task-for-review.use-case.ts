import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskPerformedEvent } from 'src/task/domain/events/task-performed.event';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { FilesService } from 'src/files/domain/services/files.service';

interface SubmitTaskForReviewInputDto {
  taskId: string;
  submittedBy: string;
  notes?: string; // optional notes to store on the task (assigner notes per schema)
  attach?: boolean;
}

@Injectable()
export class SubmitTaskForReviewUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
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

  async execute(
    dto: SubmitTaskForReviewInputDto,
    userId?: string,
  ): Promise<{ task: Task; uploadKey?: string }> {
    const [existing, submitter] = await Promise.all([
      this.taskRepo.findById(dto.taskId),
      this.userRepo
        .findById(dto.submittedBy)
        .then((user) => this.getSubmitterByUser(user)),
    ]);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });
    if (!submitter) throw new NotFoundException({ submittedBy: 'not_found' });

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.checkTaskAccess(userId, existing, userRole);
    }

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

    const [savedTask, uploadKey] = await Promise.all([
      this.taskRepo.save(existing),
      this.filesService.genUploadKey(existing.id.toString()),
      this.eventEmitter.emitAsync(
        TaskPerformedEvent.name,
        new TaskPerformedEvent(
          existing.title,
          existing.id.toString(),
          dto.submittedBy,
          new Date(),
          existing?.targetDepartment?.id.toString() ??
            existing?.targetSubDepartment?.id.toString() ??
            undefined,
          existing.status,
          Math.round((Date.now() - existing.createdAt.getTime()) / 1000),
        ),
      ),
    ]);

    return { task: savedTask, uploadKey };
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
      const allDepartments = await this.departmentRepository
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
        'You do not have access to submit this task for review',
      );
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../domain/entities/task-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { User } from 'src/shared/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskPerformedEvent } from 'src/task/domain/events/task-performed.event';
import { TaskSubmittedEvent } from '../../domain/events/task-submitted.event';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { FilesService } from 'src/files/domain/services/files.service';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';
import {
  Task,
  TaskAssignmentType,
  TaskStatus,
} from '../../domain/entities/task.entity';

interface SubmitTaskSubmissionInputDto {
  taskId: string;
  submittedBy: string;
  notes?: string;
  attach?: boolean;
}

@Injectable()
export class SubmitTaskSubmissionUseCase {
  constructor(
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async getSubmitterByUser(
    user: User,
  ): Promise<Admin | Supervisor | Employee | null> {
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

  async execute(dto: SubmitTaskSubmissionInputDto): Promise<{
    taskSubmission: TaskSubmission;
    uploadKey?: string;
    attachments: { [taskSubmissionId: string]: string[] };
  }> {
    const [existingTask, submitter] = await Promise.all([
      this.taskRepo.findById(dto.taskId),
      this.userRepo
        .findById(dto.submittedBy)
        .then((user) => this.getSubmitterByUser(user)),
    ]);

    if (!existingTask)
      throw new NotFoundException({
        details: [{ field: 'taskId', message: 'Task not found' }],
      });
    if (!submitter)
      throw new NotFoundException({
        details: [{ field: 'submittedBy', message: 'Submitter not found' }],
      });
    if (existingTask.status === TaskStatus.COMPLETED) {
      throw new BadRequestException({
        details: [{ field: 'root', message: 'Task is already completed' }],
      });
    }

    // Check department access if userId is provided
    if (dto.submittedBy) {
      const user = await this.userRepo.findById(dto.submittedBy);
      const userRole = user.role.getRole();
      await this.checkTaskAccess(dto.submittedBy, existingTask, userRole);
    }

    // Create task submission
    // Determine performer type and ID
    let performerType: 'admin' | 'supervisor' | 'employee';
    if (submitter instanceof Admin) {
      performerType = 'admin';
    } else if (submitter instanceof Supervisor) {
      performerType = 'supervisor';
    } else if (submitter instanceof Employee) {
      performerType = 'employee';
    } else {
      throw new BadRequestException({
        details: [{ field: 'submittedBy', message: 'Invalid performer type' }],
      });
    }

    const taskSubmission = TaskSubmission.create({
      task: existingTask,
      performerId: submitter.id.toString(),
      performerType,
      performer: submitter,
      notes: dto.notes,
      status: TaskSubmissionStatus.SUBMITTED,
    });

    // Update task status to PENDING_REVIEW
    existingTask.status = TaskStatus.PENDING_REVIEW;

    const [savedSubmission, _, uploadKey] = await Promise.all([
      this.taskSubmissionRepo.save(taskSubmission),
      this.taskRepo.save(existingTask),
      dto.attach
        ? this.filesService.genUploadKey(
            taskSubmission.id.toString(),
            dto.submittedBy,
          )
        : undefined,
      this.eventEmitter.emitAsync(
        TaskPerformedEvent.name,
        new TaskPerformedEvent(
          existingTask.title,
          existingTask.id.toString(),
          dto.submittedBy,
          new Date(),
          existingTask?.targetDepartment?.id.toString() ??
            existingTask?.targetSubDepartment?.id.toString() ??
            undefined,
          existingTask.status,
          Math.round((Date.now() - existingTask.createdAt.getTime()) / 1000),
        ),
      ),
    ]);

    // Emit unified task submitted event based on assignment type
    if (existingTask.assignmentType === TaskAssignmentType.DEPARTMENT) {
      // Department tasks: only admins can resolve
      this.eventEmitter.emit(
        TaskSubmittedEvent.name,
        new TaskSubmittedEvent(
          existingTask.id.toString(),
          existingTask.title,
          'ADMIN_REVIEW',
          undefined,
          undefined,
          new Date(),
        ),
      );
    } else if (
      existingTask.assignmentType === TaskAssignmentType.INDIVIDUAL ||
      existingTask.assignmentType === TaskAssignmentType.SUB_DEPARTMENT
    ) {
      // Individual and Sub-department tasks: both supervisors and admins can resolve
      this.eventEmitter.emit(
        TaskSubmittedEvent.name,
        new TaskSubmittedEvent(
          existingTask.id.toString(),
          existingTask.title,
          'SUPERVISOR_AND_ADMIN_REVIEW',
          existingTask.assignee?.userId.toString(),
          existingTask.assignee?.supervisorId?.toString(),
          new Date(),
        ),
      );
    }

    // Get attachments for the saved submission
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [savedSubmission.id.toString()],
    });

    return { taskSubmission: savedSubmission, uploadKey, attachments };
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

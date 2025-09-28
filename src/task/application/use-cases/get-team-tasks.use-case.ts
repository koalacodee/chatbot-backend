import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

export interface GetTeamTasksInput {
  employeeId?: string;
  subDepartmentId?: string;
  departmentId?: string;
  includeSubDepartmentTasks?: boolean;
  includeDepartmentTasks?: boolean;
  status?: string[];
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetTeamTasksUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly taskSubmissionRepository: TaskSubmissionRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    input: GetTeamTasksInput,
    userId?: string,
  ): Promise<{
    tasks: Task[];
    submissions: TaskSubmission[];
    attachments: { [taskId: string]: string[] };
  }> {
    const { employeeId, subDepartmentId, departmentId, status, offset, limit } =
      input;

    // Apply department filtering if userId is provided
    let filteredInput = { ...input };
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      const userDepartmentIds = await this.getUserDepartmentIds(
        userId,
        userRole,
      );

      // Filter department and subDepartment IDs based on user access
      if (userDepartmentIds.length > 0) {
        if (departmentId && !userDepartmentIds.includes(departmentId)) {
          return { tasks: [], submissions: [], attachments: {} }; // User doesn't have access to this department
        }
        if (subDepartmentId && !userDepartmentIds.includes(subDepartmentId)) {
          return { tasks: [], submissions: [], attachments: {} }; // User doesn't have access to this sub-department
        }
      }
    }

    // Use the new repository method for efficient database-level filtering
    const tasks = await this.taskRepository.findTeamTasks({
      employeeId,
      subDepartmentId,
      departmentId,
      status,
      offset,
      limit,
    });

    // Get attachments and submissions for all tasks
    const [attachments, submissions] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: tasks.map((task) => task.id.toString()),
      }),
      this.taskSubmissionRepository.findByTaskIds(
        tasks.map((task) => task.id.toString()),
      ),
    ]);

    return { tasks, submissions, attachments };
  }

  private async getUserDepartmentIds(
    userId: string,
    role: Roles,
  ): Promise<string[]> {
    if (role === Roles.ADMIN) {
      return []; // Admins see all tasks (no filtering)
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      return supervisor.departments.map((d) => d.id.toString());
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      return (
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        []
      );
    }
    return [];
  }
}

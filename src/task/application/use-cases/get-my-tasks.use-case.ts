import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';
import { TaskStatus } from '../../domain/entities/task.entity';

interface GetMyTasksInputDto {
  userId: string;
  offset?: number;
  limit?: number;
  status?: string;
}

interface MyTasksResult {
  tasks: Task[];
  delegations?: TaskDelegation[];
  total: number;
  canSubmitWork: boolean[];
  submissions: TaskSubmission[];
  attachments: { [taskId: string]: string[] };
  delegationAttachments?: { [delegationId: string]: string[] };
  metrics: {
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  };
}

@Injectable()
export class GetMyTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) { }

  async execute(dto: GetMyTasksInputDto): Promise<MyTasksResult> {
    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    const userRole = user.role.getRole();

    switch (userRole) {
      case Roles.SUPERVISOR:
        return this.getSupervisorTasks(dto);
      case Roles.EMPLOYEE:
        return this.getEmployeeTasks(dto);
      case Roles.ADMIN:
        throw new ForbiddenException({
          details: [
            { field: 'role', message: 'Admins do not have my-tasks endpoint' },
          ],
        });
      default:
        throw new ForbiddenException({
          details: [{ field: 'role', message: 'Invalid user role' }],
        });
    }
  }

  private async getSupervisorTasks(
    dto: GetMyTasksInputDto,
  ): Promise<MyTasksResult> {
    const supervisor = await this.supervisorRepository.findByUserId(dto.userId);
    if (!supervisor) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'Supervisor not found' }],
      });
    }

    const supervisorDepartmentIds = supervisor.departments.map((d) =>
      d.id.toString(),
    );

    if (supervisorDepartmentIds.length === 0) {
      return {
        tasks: [],
        total: 0,
        canSubmitWork: [],
        submissions: [],
        attachments: {},
        metrics: {
          pendingCount: 0,
          completedCount: 0,
          completionPercentage: 0,
        },
      };
    }

    const result = await this.taskRepo.findTasksForSupervisor({
      supervisorDepartmentIds,
      status: dto.status ? [dto.status] : undefined,
      offset: dto.offset,
      limit: dto.limit,
    });

    const metrics = await this.taskRepo.getTaskMetricsForSupervisor(
      supervisorDepartmentIds,
    );

    const [attachments, submissions] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: result.tasks.map((task) => task.id.toString()),
      }),
      this.taskSubmissionRepo.findByTaskIds(
        result.tasks.map((task) => task.id.toString()),
      ),
    ]);

    return {
      tasks: result.tasks,
      total: result.total,
      canSubmitWork: result.tasks.map(() => true),
      submissions,
      attachments,
      metrics,
    };
  }

  private async getEmployeeTasks(
    dto: GetMyTasksInputDto,
  ): Promise<MyTasksResult> {
    const employee = await this.employeeRepository.findByUserId(dto.userId);
    if (!employee) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'Employee not found' }],
      });
    }

    const employeeSubDepartmentIds = employee.subDepartments
      .map((sd) => sd.parentId?.toString())
      .filter((id) => id !== undefined && id !== '');

    const employeeSubDepartmentIdsForDelegations = employee.subDepartments.map(
      (sd) => sd.id.toString(),
    );

    const [result, delegationsByAssignee, delegationsBySubDepartment] =
      await Promise.all([
        this.taskRepo.findTasksForEmployee({
          employeeId: employee.id.toString(),
          supervisorId: employee.supervisor.id.toString(),
          subDepartmentIds: employeeSubDepartmentIds,
          status: dto.status ? [dto.status] : undefined,
          offset: dto.offset,
          limit: dto.limit,
        }),
        this.taskDelegationRepository.findByAssigneeId(employee.id.toString()),
        employeeSubDepartmentIdsForDelegations.length > 0
          ? this.taskDelegationRepository.findByTargetSubDepartmentIds(
            employeeSubDepartmentIdsForDelegations,
          )
          : Promise.resolve<TaskDelegation[]>([]),
      ]);

    // Combine delegations and remove duplicates
    const allDelegations = [
      ...delegationsByAssignee,
      ...delegationsBySubDepartment,
    ];
    const uniqueDelegations = Array.from(
      new Map(
        allDelegations.map((d) => [d.id.toString(), d]),
      ).values(),
    );

    // Filter delegations by status if provided
    let filteredDelegations = uniqueDelegations;
    if (dto.status) {
      filteredDelegations = uniqueDelegations.filter(
        (delegation) => delegation.status === (dto.status as TaskStatus),
      );
    }

    // Apply offset and limit to delegations
    const delegationsOffset = dto.offset ?? 0;
    const delegationsLimit = dto.limit;
    const paginatedDelegations = delegationsLimit
      ? filteredDelegations.slice(
        delegationsOffset,
        delegationsOffset + delegationsLimit,
      )
      : filteredDelegations.slice(delegationsOffset);

    const metrics = await this.taskRepo.getTaskMetricsForEmployee(
      employee.id.toString(),
      employee.supervisor.id.toString(),
      employeeSubDepartmentIds,
    );

    // Get task IDs from delegations for attachments
    const delegationTaskIds = paginatedDelegations.map((d) => d.taskId);

    const [attachments, delegationAttachments, submissions] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: result.tasks.map((task) => task.id.toString()),
      }),
      delegationTaskIds.length > 0
        ? this.getAttachmentsUseCase.execute({
          targetIds: delegationTaskIds,
        })
        : Promise.resolve({}),
      this.taskSubmissionRepo.findByTaskIds(
        result.tasks.map((task) => task.id.toString()),
      ),
    ]);

    // Map delegation attachments: use task attachments for each delegation
    const delegationAttachmentsMap: { [delegationId: string]: string[] } = {};
    paginatedDelegations.forEach((delegation) => {
      delegationAttachmentsMap[delegation.id.toString()] =
        delegationAttachments[delegation.taskId] || [];
    });

    return {
      tasks: result.tasks,
      delegations: paginatedDelegations,
      total: result.total,
      canSubmitWork: result.tasks.map((task) => {
        const isAssignedToEmployee =
          task.assignee?.id.toString() === employee.id.toString();
        const isInSubDepartment =
          task.targetSubDepartment &&
          employeeSubDepartmentIds.includes(
            task.targetSubDepartment.id.toString(),
          );
        return isAssignedToEmployee || isInSubDepartment;
      }),
      submissions,
      attachments,
      delegationAttachments: delegationAttachmentsMap,
      metrics,
    };
  }
}

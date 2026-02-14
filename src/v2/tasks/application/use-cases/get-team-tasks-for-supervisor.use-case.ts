import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import {
  CursorInput,
  PaginatedObjectResult,
} from '@/common/drizzle/helpers/cursor';
import {
  Task,
  TaskPriority,
  TaskStatus,
} from '../../domain/entities/task.entity';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

@Injectable()
export class GetTeamTasksForSupervisorUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(input: {
    supervisorUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
    departmentId?: string;
    subDepartmentId?: string;
  }): Promise<
    PaginatedObjectResult<{
      tasks: {
        task: ReturnType<typeof Task.prototype.toJSON>;
        submissions: ReturnType<typeof TaskSubmission.prototype.toJSON>[];
        delegationSubmissions: ReturnType<
          typeof TaskDelegationSubmission.prototype.toJSON
        >[];
        rejectionReason?: string;
        approvalFeedback?: string;
      }[];
      attachments: FilehubAttachmentMessage[];
      metrics: {
        pendingTasks: number;
        completedTasks: number;
        taskCompletionPercentage: number;
      };
    }>
  > {
    const departments = await this.departmentRepo.getSupervisorDepartments({
      supervisorIdOrUserId: { supervisorUserId: input.supervisorUserId },
      fullDepartment: false,
    });

    if (departments.length == 0) {
      throw new NotFoundException({
        details: [
          { field: 'supervisorUserId', message: 'Supervisor not found' },
        ],
      });
    }

    const { data, meta, metrics } =
      await this.taskRepo.getTeamTasksForSupervisor({
        supervisorDepartmentIds: departments.map((d) => d.id),
        status: input.status,
        priority: input.priority,
        cursor: input.cursor,
        search: input.search,
        departmentId: input.departmentId,
        subDepartmentId: input.subDepartmentId,
      });

    const taskIds = data.map(({ task }) => task.data.id);
    const delegationSubmissions =
      await this.taskDelegationSubmissionRepo.findByTaskIds(taskIds, true);
    const delegationSubsByTaskId = new Map<
      string,
      TaskDelegationSubmission[]
    >();
    for (const ds of delegationSubmissions) {
      const arr = delegationSubsByTaskId.get(ds.taskId) ?? [];
      arr.push(ds);
      delegationSubsByTaskId.set(ds.taskId, arr);
    }

    const allTargetIds = [
      ...taskIds,
      ...data.flatMap(({ task }) => task.submissions.map((s) => s.id)),
      ...delegationSubmissions.map((s) => s.id),
    ];
    const fileHubAttachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: allTargetIds,
        expiresInMs: 1000 * 60 * 60 * 24,
      });

    return {
      data: {
        tasks: data.map(({ task }) => {
          const rejection = task.submissions.find(
            (s) => s.status === 'REJECTED',
          );
          const approval = task.submissions.find(
            (s) => s.status === 'APPROVED',
          );
          const taskDelegationSubs =
            delegationSubsByTaskId.get(task.data.id) ?? [];

          const linkedDelegationIds = new Set(
            task.submissions
              .map((s) => s.delegationSubmissionId)
              .filter(Boolean),
          );
          const filteredDelegationSubs = taskDelegationSubs.filter(
            (s) => !linkedDelegationIds.has(s.id),
          );

          return {
            task: task.data.toJSON(),
            submissions: task.submissions.map((s) => s.toJSON()),
            delegationSubmissions: filteredDelegationSubs.map((s) => s.toJSON()),
            rejectionReason: rejection?.feedback,
            approvalFeedback: approval?.feedback,
          };
        }),
        attachments: fileHubAttachments,
        metrics,
      },
      meta,
    };
  }
}

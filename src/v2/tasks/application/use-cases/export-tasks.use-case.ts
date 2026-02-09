import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { Task } from '../../domain/entities/task.entity';
import { ExportService } from '@/export/domain/services/export.service';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { Export } from '@/export/domain/entities/export.entity';

interface ExportTasksInput {
  userId: string;
  batchSize?: number;
  start?: Date | string;
  end?: Date | string;
}

@Injectable()
export class ExportTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly exportService: ExportService,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
  ) {}

  private formatDateHuman(d: Date | string | undefined | null): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  async execute({
    userId,
    batchSize = 500,
    start,
    end,
  }: ExportTasksInput): Promise<Export> {
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    let departmentIds: string[] = [];

    if (userRole === Roles.SUPERVISOR) {
      const departments = await this.departmentRepo.getSupervisorDepartments({
        supervisorIdOrUserId: { supervisorUserId: userId },
        fullDepartment: false,
      });
      departmentIds = departments.map((d) => d.id);
    } else if (userRole === Roles.EMPLOYEE) {
      const subDepartments =
        await this.departmentRepo.getEmployeeSubDepartments(
          { employeeUserId: userId },
          false,
        );
      departmentIds = subDepartments.map((d) => d.id);
    }

    const startDate =
      typeof start === 'string' ? new Date(start) : (start ?? undefined);
    const endDate =
      typeof end === 'string' ? new Date(end) : (end ?? undefined);

    const self = this;
    async function* batchGenerator() {
      let cursor: string | undefined = undefined;
      for (;;) {
        const result = await self.taskRepo.findAll({
          cursor: cursor
            ? { cursor, direction: 'next', pageSize: batchSize }
            : { cursor: '', direction: 'next', pageSize: batchSize },
          departmentIds: userRole === Roles.ADMIN ? undefined : departmentIds,
          start: startDate,
          end: endDate,
        });

        const tasks = result.data;
        if (!tasks.length) break;

        const taskIds = tasks.map((t) => t.id.toString());
        const submissions =
          await self.taskSubmissionRepo.findByTaskIds(taskIds);

        const rows = tasks.map((t) => {
          const submission = submissions.find(
            (s) => s.task.id.toString() === t.id.toString(),
          );
          const taskJson = t.toJSON();

          return {
            title: t.title,
            description: t.description,
            departmentName: t.targetDepartment?.name ?? '',
            subDepartmentName: t.targetSubDepartment?.name ?? '',
            status: t.status,
            priority: t.priority,
            assignmentType: t.assignmentType,
            submissionNotes: submission?.notes ?? '',
            submissionFeedback: submission?.feedback ?? '',
            submissionStatus: submission?.status ?? '',
            assigneeName: taskJson.assignee?.name ?? '',
            assignerName: taskJson.assigner?.name ?? '',
            approverName: taskJson.approver?.name ?? '',
            dueDate: self.formatDateHuman(t.dueDate),
            createdAt: self.formatDateHuman(t.createdAt),
            updatedAt: self.formatDateHuman(t.updatedAt),
            completedAt: self.formatDateHuman(t.completedAt),
          };
        });

        yield rows;
        if (!result.meta.hasNextPage || !result.meta.nextCursor) break;
        cursor = result.meta.nextCursor;
      }
    }

    const exportEntity =
      await this.exportService.exportFromAsyncGenerator(batchGenerator());
    return exportEntity;
  }
}

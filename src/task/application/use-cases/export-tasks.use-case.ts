import { Injectable } from '@nestjs/common';
import { ExportService } from 'src/export/domain/services/export.service';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { Export } from 'src/export/domain/entities/export.entity';

interface ExportTasksInput {
  batchSize?: number;
  departmentIds?: string[];
  start?: Date | string;
  end?: Date | string;
}

@Injectable()
export class ExportTasksUseCase {
  constructor(
    private readonly exportService: ExportService,
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
  ) { }

  private formatDateHuman(d: Date | string | undefined | null): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    } as any).format(date as Date);
  }

  async execute({
    batchSize = 500,
    departmentIds,
    start,
    end,
  }: ExportTasksInput = {}): Promise<Export> {
    const startDate =
      typeof start === 'string' ? new Date(start) : start ?? undefined;
    const endDate = typeof end === 'string' ? new Date(end) : end ?? undefined;
    const self = this;
    async function* batchGenerator() {
      let offset = 0;
      for (; ;) {
        const tasks = await self.taskRepo.findAll(
          offset,
          batchSize,
          departmentIds,
          startDate,
          endDate,
        );
        if (!tasks.length) break;

        const taskIds = tasks.map((t) => t.id.toString());
        const submissions = await self.taskSubmissionRepo.findByTaskIds(taskIds);

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
        offset += tasks.length;
      }
    }

    const exportEntity = await this.exportService.exportFromAsyncGenerator(batchGenerator());
    return exportEntity;
  }
}


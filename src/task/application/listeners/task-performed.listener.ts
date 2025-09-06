import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';
import { TaskPerformedEvent } from 'src/task/domain/events/task-performed.event';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Injectable()
export class TaskPerformedListener {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  @OnEvent(TaskPerformedEvent.name)
  async handleTaskPerformedEvent(event: TaskPerformedEvent): Promise<void> {
    const activityLog = ActivityLog.create({
      type: ActivityLogType.TASK_PERFORMED,
      title: event.title,
      itemId: event.itemId,
      userId: event.userId,
      meta: {
        departmentId: event.departmentId,
        status: event.status,
        performedInSeconds: event.performedInSeconds,
      },
      occurredAt: event.occurredAt,
    });

    await this.activityLogRepository.save(activityLog);
  }
}

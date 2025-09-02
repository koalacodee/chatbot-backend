import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

export class TaskApprovedEvent {
  constructor(
    public readonly title: string,
    public readonly itemId: string,
    public readonly userId: string,
    public readonly occurredAt: Date,
    public readonly performedById: string,
  ) {}
}

@Injectable()
export class TaskApprovedListener {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  @OnEvent(TaskApprovedEvent.name)
  async handleTaskApprovedEvent(event: TaskApprovedEvent): Promise<void> {
    const activityLog = ActivityLog.create({
      type: ActivityLogType.TASK_APPROVED,
      title: `Task approved: ${event.title}`,
      itemId: event.itemId,
      userId: event.userId,
      meta: {
        performedById: event.performedById,
      },
      occurredAt: event.occurredAt,
    });

    await this.activityLogRepository.save(activityLog);
  }
}

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

export class StaffRequestedEvent {
  constructor(
    public readonly itemId: string,
    public readonly userId: string,
    public readonly occurredAt: Date,
    public readonly newEmployeeFullName: string,
  ) {}
}

@Injectable()
export class StaffRequestedListener {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  @OnEvent(StaffRequestedEvent.name)
  async handleStaffRequestedEvent(event: StaffRequestedEvent): Promise<void> {
    const activityLog = ActivityLog.create({
      type: ActivityLogType.STAFF_REQUEST_CREATED,
      title: `Staff request created for ${event.newEmployeeFullName}`,
      itemId: event.itemId,
      userId: event.userId,
      meta: {
        newEmployeeFullName: event.newEmployeeFullName,
      },
      occurredAt: event.occurredAt,
    });

    await this.activityLogRepository.save(activityLog);
  }
}

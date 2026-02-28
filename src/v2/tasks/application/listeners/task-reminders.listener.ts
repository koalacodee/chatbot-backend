import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskRemindersCreatedEvent } from '../../domain/events/task-reminders-created.event';
import { ReminderQueueService } from '@/v2/tasks/infrastructure/queues/reminder.queue';

@Injectable()
export class TaskRemindersListener {
  constructor(private readonly reminderQueueService: ReminderQueueService) {}

  @OnEvent(TaskRemindersCreatedEvent.name, { async: true })
  async handleTaskRemindersCreatedEvent(event: TaskRemindersCreatedEvent) {
    const daysOffset = event.daysBeforeDeadlineReminder || 0;
    await Promise.all(
      event.reminders.map((reminder) => {
        const startDate = new Date(reminder.dueDate);
        startDate.setDate(startDate.getDate() - daysOffset);
        return this.reminderQueueService.scheduleReminder(
          reminder.id,
          event.taskId,
          reminder.interval,
          startDate,
        );
      }),
    );
  }
}

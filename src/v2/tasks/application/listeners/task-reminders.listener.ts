import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskRemindersCreatedEvent } from '../../domain/events/task-reminders-created.event';
import { ReminderQueueService } from '@/v2/tasks/infrastructure/queues/reminder.queue';

@Injectable()
export class TaskRemindersListener {
  constructor(private readonly reminderQueueService: ReminderQueueService) {}

  @OnEvent(TaskRemindersCreatedEvent.name, { async: true })
  async handleTaskRemindersCreatedEvent(event: TaskRemindersCreatedEvent) {
    await Promise.all(
      event.reminders.map((reminder) =>
        this.reminderQueueService.scheduleReminder(
          reminder.id,
          event.taskId,
          reminder.interval,
          reminder.dueDate,
        ),
      ),
    );
  }
}

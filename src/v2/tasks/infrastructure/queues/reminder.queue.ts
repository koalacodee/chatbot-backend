import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ReminderQueueService {
  constructor(
    @InjectQueue('v2-task-reminders')
    private readonly reminderQueue: Queue,
  ) { }

  /**
   * Schedule a repeatable reminder job for a specific reminder
   * @param reminderId - The reminder record ID (from task_reminders table)
   * @param taskId - The task ID (stored in job data for processing)
   * @param reminderInterval - Interval in milliseconds
   * @param startAt - Optional start date for the first reminder
   */
  async scheduleReminder(
    reminderId: string,
    taskId: string,
    reminderInterval: number,
    startAt?: Date,
  ): Promise<void> {
    const jobId = `reminder-${reminderId}`;

    const now = Date.now();
    const startMs = startAt?.getTime() ?? now;
    const baseStart = startMs > now ? startMs : now;
    const delay = baseStart - now + reminderInterval;

    await this.reminderQueue.add(
      'remind',
      { taskId, reminderId },
      {
        delay,
        repeat: { every: reminderInterval },
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  /**
   * Remove a repeatable reminder job
   * @param reminderId - The reminder record ID
   */
  async removeReminder(reminderId: string): Promise<void> {
    const jobId = `reminder-${reminderId}`;

    await this.reminderQueue.removeJobScheduler(
      `repeat:${jobId}:${this.reminderQueue.name}`,
    );

    await this.reminderQueue.remove(jobId);
  }

  /**
   * Update an existing reminder job
   * @param reminderId - The reminder record ID
   * @param taskId - The task ID
   * @param newReminderInterval - New interval in milliseconds
   * @param startAt - Optional start date
   */
  async updateReminder(
    reminderId: string,
    taskId: string,
    newReminderInterval: number,
    startAt?: Date,
  ): Promise<void> {
    await this.removeReminder(reminderId);
    await this.scheduleReminder(reminderId, taskId, newReminderInterval, startAt);
  }
}

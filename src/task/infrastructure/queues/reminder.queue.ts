import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ReminderQueueService {
  constructor(
    @InjectQueue('task-reminders')
    private readonly reminderQueue: Queue,
  ) {}

  /**
   * Schedule a repeatable reminder job for a task
   * @param taskId - The task ID
   * @param reminderInterval - Interval in milliseconds
   */
  async scheduleReminder(
    taskId: string,
    reminderInterval: number,
  ): Promise<void> {
    const jobId = `reminder-${taskId}`;

    await this.reminderQueue.add(
      'remind',
      { taskId },
      {
        delay: reminderInterval, // Initial delay
        repeat: { every: reminderInterval },
        jobId,
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      },
    );
  }

  /**
   * Remove a repeatable reminder job for a task
   * @param taskId - The task ID
   */
  async removeReminder(taskId: string): Promise<void> {
    const jobId = `reminder-${taskId}`;

    // Remove the repeatable job
    await this.reminderQueue.removeJobScheduler(
      `repeat:${jobId}:${this.reminderQueue.name}`,
    );

    // Also remove any existing jobs with this ID
    await this.reminderQueue.remove(jobId);
  }

  /**
   * Update an existing reminder job
   * @param taskId - The task ID
   * @param newReminderInterval - New interval in milliseconds
   */
  async updateReminder(
    taskId: string,
    newReminderInterval: number,
  ): Promise<void> {
    // Remove existing job first
    await this.removeReminder(taskId);

    // Schedule new job with updated interval
    await this.scheduleReminder(taskId, newReminderInterval);
  }
}

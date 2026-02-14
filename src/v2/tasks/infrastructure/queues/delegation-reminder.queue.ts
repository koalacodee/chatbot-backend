import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class DelegationReminderQueueService {
  constructor(
    @InjectQueue('v2-task-delegation-reminders')
    private readonly reminderQueue: Queue,
  ) { }

  /**
   * Schedule a repeatable reminder job for a task delegation
   * @param delegationId - The delegation ID
   * @param reminderInterval - Interval in milliseconds
   */
  async scheduleReminder(
    delegationId: string,
    reminderInterval: number,
    startAt?: Date,
  ): Promise<void> {
    const jobId = `delegation-reminder-${delegationId}`;

    const now = Date.now();
    const startMs = startAt?.getTime() ?? now;
    const baseStart = startMs > now ? startMs : now;
    const delay = baseStart - now + reminderInterval;

    await this.reminderQueue.add(
      'remind',
      { delegationId },
      {
        delay, // Initial delay (respects optional reminderStartDate)
        repeat: { every: reminderInterval },
        jobId,
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      },
    );
  }

  /**
   * Remove a repeatable reminder job for a task delegation
   * @param delegationId - The delegation ID
   */
  async removeReminder(delegationId: string): Promise<void> {
    const jobId = `delegation-reminder-${delegationId}`;

    // Remove the repeatable job
    await this.reminderQueue.removeJobScheduler(
      `repeat:${jobId}:${this.reminderQueue.name}`,
    );

    // Also remove any existing jobs with this ID
    await this.reminderQueue.remove(jobId);
  }

  /**
   * Update an existing reminder job
   * @param delegationId - The delegation ID
   * @param newReminderInterval - New interval in milliseconds
   */
  async updateReminder(
    delegationId: string,
    newReminderInterval: number,
    startAt?: Date,
  ): Promise<void> {
    // Remove existing job first
    await this.removeReminder(delegationId);

    // Schedule new job with updated interval
    await this.scheduleReminder(delegationId, newReminderInterval, startAt);
  }
}


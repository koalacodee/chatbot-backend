import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskCreatedEvent } from '../../domain/events/task-created.event';
import { TaskStatus } from '../../domain/entities/task.entity';

interface ReminderJobData {
  taskId: string;
}

@Processor('task-reminders')
export class ReminderProcessor extends WorkerHost {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('task-reminders') private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<void> {
    const { taskId } = job.data;

    try {
      // Fetch task with database-level filtering
      const task = await this.taskRepository.findTaskForReminder(taskId);

      if (!task) {
        // Task doesn't exist or is not in a state that should receive reminders
        // Remove the repeatable job to prevent future attempts
        await this.removeRepeatableJob(job);
        return;
      }

      // Check if task is still in a state that should receive reminders
      if (
        task.status === TaskStatus.COMPLETED ||
        task.status === TaskStatus.PENDING_REVIEW
      ) {
        // Task is completed or under review, remove the repeatable job
        await this.removeRepeatableJob(job);
        return;
      }

      // Fire the TaskReminderEvent
      const reminderEvent = new TaskCreatedEvent(
        task.id.toString(),
        task.title,
        task.assignmentType,
        task.assigneeId.toString(),
        task.targetDepartmentId.toString(),
        task.targetSubDepartmentId.toString(),
        task.createdAt,
      );

      await this.eventEmitter.emitAsync(TaskCreatedEvent.name, reminderEvent);
    } catch (error) {
      console.error(`Error processing reminder for task ${taskId}:`, error);
      // Don't throw the error to prevent job retries
      // The job will be marked as failed but won't retry
    }
  }

  private async removeRepeatableJob(job: Job): Promise<void> {
    try {
      // Remove the repeatable job to prevent future executions
      const repeatableKey = `repeat:${job.id}:${job.queueName}`;
      // Create a full Queue instance to access removeRepeatableByKey
      await this.queue.removeJobScheduler(repeatableKey);
    } catch (error) {
      console.error('Error removing repeatable job:', error);
    }
  }
}

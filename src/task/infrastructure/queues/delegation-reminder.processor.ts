import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskStatus } from '../../domain/entities/task.entity';
import { TaskDelegationCreatedEvent } from '../../domain/events/task-delegation-created.event';

interface DelegationReminderJobData {
  delegationId: string;
}

@Processor('task-delegation-reminders')
export class DelegationReminderProcessor extends WorkerHost {
  constructor(
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('task-delegation-reminders') private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<DelegationReminderJobData>): Promise<void> {
    const { delegationId } = job.data;

    try {
      // Fetch delegation with database-level filtering
      const delegation = await this.taskDelegationRepository.findById(
        delegationId,
      );

      if (!delegation) {
        // Delegation doesn't exist or is not in a state that should receive reminders
        // Remove the repeatable job to prevent future attempts
        await this.removeRepeatableJob(job);
        return;
      }

      // Check if delegation is still in a state that should receive reminders
      if (
        delegation.status === TaskStatus.COMPLETED ||
        delegation.status === TaskStatus.PENDING_REVIEW ||
        delegation.status === TaskStatus.SEEN
      ) {
        // Delegation is completed or under review, remove the repeatable job
        await this.removeRepeatableJob(job);
        return;
      }

      // Get task information for the event
      const task = delegation.task;
      if (!task) {
        // Task not loaded, remove the repeatable job
        await this.removeRepeatableJob(job);
        return;
      }

      // Fire the TaskDelegationCreatedEvent
      const reminderEvent = new TaskDelegationCreatedEvent(
        delegation.id.toString(),
        task.id.toString(),
        task.title,
        delegation.assignmentType,
        delegation.assigneeId,
        delegation.targetSubDepartmentId,
        delegation.delegatorId,
        delegation.createdAt,
      );

      await this.eventEmitter.emitAsync(
        TaskDelegationCreatedEvent.name,
        reminderEvent,
      );
    } catch (error) {
      console.error(
        `Error processing reminder for delegation ${delegationId}:`,
        error,
      );
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


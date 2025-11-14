import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { TaskDelegation } from './task-delegation.entity';
import { TaskSubmissionStatus } from './task-submission.entity';
import { Task } from './task.entity';

export interface TaskDelegationSubmissionOptions {
  id?: string;
  delegationId: string;
  delegation?: TaskDelegation;
  taskId: string;
  task?: Task;
  performerId: string;
  performerType: 'admin' | 'supervisor' | 'employee';
  performerName?: string;
  performer?: Admin | Supervisor | Employee;
  notes?: string;
  feedback?: string;
  status: TaskSubmissionStatus;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: Admin | Supervisor;
  forwarded?: boolean;
}

export class TaskDelegationSubmission {
  private readonly _id: UUID;
  private _delegationId: UUID;
  private _delegation?: TaskDelegation;
  private _taskId: UUID;
  private _task?: Task;
  private _performerId: string;
  private _performerType: 'admin' | 'supervisor' | 'employee';
  private _performerName?: string;
  private _performer?: Admin | Supervisor | Employee;
  private _notes?: string;
  private _feedback?: string;
  private _status: TaskSubmissionStatus;
  private _submittedAt: Date;
  private _reviewedAt?: Date;
  private _reviewedBy?: Admin | Supervisor;
  private _forwarded: boolean;

  private constructor(options: TaskDelegationSubmissionOptions) {
    this._id = UUID.create(options.id);
    this._delegationId = UUID.create(options.delegationId);
    this._delegation = options.delegation;
    this._taskId = UUID.create(options.taskId);
    this._task = options.task;
    this._performerId = options.performerId;
    this._performerType = options.performerType;
    this._performerName = options.performerName ?? undefined;
    this._performer = options.performer ?? undefined;
    this._notes = options.notes ?? undefined;
    this._feedback = options.feedback ?? undefined;
    this._status = options.status;
    this._submittedAt = options.submittedAt ?? new Date();
    this._reviewedAt = options.reviewedAt ?? undefined;
    this._reviewedBy = options.reviewedBy ?? undefined;
    this._forwarded = options.forwarded ?? false;
  }

  static create(options: TaskDelegationSubmissionOptions): TaskDelegationSubmission {
    return new TaskDelegationSubmission(options);
  }

  get id(): UUID {
    return this._id;
  }

  get taskId(): UUID {
    return this._taskId;
  }

  set taskId(value: UUID) {
    this._taskId = value;
  }

  get task(): Task | undefined {
    return this._task;
  }

  set task(value: Task | undefined) {
    this._task = value;
  }

  get delegation(): TaskDelegation {
    return this._delegation;
  }

  get delegationId(): UUID {
    return this._delegationId;
  }

  set delegationId(value: UUID) {
    this._delegationId = value;
  }

  set delegation(value: TaskDelegation) {
    this._delegation = value;
  }

  get performerId(): string {
    return this._performerId;
  }

  set performerId(value: string) {
    this._performerId = value;
  }

  get performerType(): 'admin' | 'supervisor' | 'employee' {
    return this._performerType;
  }

  set performerType(value: 'admin' | 'supervisor' | 'employee') {
    this._performerType = value;
  }

  get performerName(): string | undefined {
    return this._performerName ?? undefined;
  }

  set performerName(value: string | undefined) {
    this._performerName = value;
  }

  get performer(): Admin | Supervisor | Employee | undefined {
    return this._performer;
  }

  set performer(value: Admin | Supervisor | Employee | undefined) {
    this._performer = value;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  set notes(value: string | undefined) {
    this._notes = value;
  }

  get feedback(): string | undefined {
    return this._feedback;
  }

  set feedback(value: string | undefined) {
    this._feedback = value;
  }

  get status(): TaskSubmissionStatus {
    return this._status;
  }

  set status(value: TaskSubmissionStatus) {
    this._status = value;
  }

  get submittedAt(): Date {
    return this._submittedAt;
  }

  set submittedAt(value: Date) {
    this._submittedAt = value;
  }

  get reviewedAt(): Date | undefined {
    return this._reviewedAt;
  }

  set reviewedAt(value: Date | undefined) {
    this._reviewedAt = value;
  }

  get reviewedBy(): Admin | Supervisor | undefined {
    return this._reviewedBy;
  }

  set reviewedBy(value: Admin | Supervisor | undefined) {
    this._reviewedBy = value;
  }

  get forwarded(): boolean {
    return this._forwarded;
  }

  set forwarded(value: boolean) {
    this._forwarded = value;
  }

  // Business logic methods
  approve(reviewer: Admin | Supervisor, feedback?: string): void {
    this._status = TaskSubmissionStatus.APPROVED;
    this._reviewedAt = new Date();
    this._reviewedBy = reviewer;
    if (feedback) {
      this._feedback = feedback;
    }
  }

  reject(reviewer: Admin | Supervisor, feedback?: string): void {
    this._status = TaskSubmissionStatus.REJECTED;
    this._reviewedAt = new Date();
    this._reviewedBy = reviewer;
    if (feedback) {
      this._feedback = feedback;
    }
  }

  isApproved(): boolean {
    return this._status === TaskSubmissionStatus.APPROVED;
  }

  isRejected(): boolean {
    return this._status === TaskSubmissionStatus.REJECTED;
  }

  isSubmitted(): boolean {
    return this._status === TaskSubmissionStatus.SUBMITTED;
  }

  toJSON(): any {
    return {
      id: this.id.toString(),
      delegationId: this.delegationId.toString(),
      delegation: this.delegation?.toJSON(),
      taskId: this.taskId.toString(),
      task: this.task?.toJSON(),
      performerId: this.performerId,
      performerType: this.performerType,
      performerName: this.performerName,
      performer: this.performer?.toJSON(),
      notes: this.notes,
      feedback: this.feedback,
      status: this.status,
      submittedAt: this.submittedAt.toISOString(),
      reviewedAt: this.reviewedAt?.toISOString(),
      reviewedBy: this.reviewedBy?.toJSON(),
      forwarded: this.forwarded,
    };
  }
}

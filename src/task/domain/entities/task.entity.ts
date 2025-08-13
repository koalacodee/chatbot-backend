import { Department } from 'src/department/domain/entities/department.entity';
import { Attachment } from 'src/shared/entities/attachment.entity';
import { User } from 'src/shared/entities/user.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

enum TaskStatus {
  TODO = 'TODO',
  SEEN = 'SEEN',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PENDING_SUPERVISOR_REVIEW = 'PENDING_SUPERVISOR_REVIEW',
  COMPLETED = 'COMPLETED',
}

export interface TaskOptions {
  id?: string;
  title: string;
  description: string;
  department: Department;
  assignee: User;
  assigner: User;
  approver?: User;
  status: TaskStatus;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  notes?: string;
  feedback?: string;
  assigneeAttachment?: Attachment;
  assignerAttachment?: Attachment;
}

export class Task {
  private readonly _id: UUID;
  private _title: string;
  private _description: string;
  private _department: Department;
  private _assignee: User;
  private _assigner: User;
  private _approver: User;
  private _status: TaskStatus;
  private _createAt: Date;
  private _updatedAt: Date;
  private _completedAt: Date;
  private _notes: string;
  private _feedback: string;
  private _assigneeAttachment?: Attachment;
  private _assignerAttachment?: Attachment;

  private constructor(options: TaskOptions) {
    this._id = UUID.create(options.id);
    this._title = options.title;
    this._description = options.description;
    this._department = options.department;
    this._assignee = options.assignee;
    this._assigner = options.assigner;
    this._approver = options.approver;
    this._status = options.status;
    this._createAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._completedAt = options.completedAt ?? undefined;
    this._notes = options.notes ?? undefined;
    this._feedback = options.feedback ?? undefined;
    this._assigneeAttachment = options.assigneeAttachment;
    this._assignerAttachment = options.assignerAttachment;
  }

  static create(options: TaskOptions): Task {
    return new Task(options);
  }

  get id(): UUID {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
  }

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    this._description = value;
  }

  get department(): Department {
    return this._department;
  }

  set department(value: Department) {
    this._department = value;
  }

  get assignee(): User {
    return this._assignee;
  }

  set assignee(value: User) {
    this._assignee = value;
  }

  get assigner(): User {
    return this._assigner;
  }

  set assigner(value: User) {
    this._assigner = value;
  }

  get approver(): User {
    return this._approver;
  }

  set approver(value: User) {
    this._approver = value;
  }

  get status(): TaskStatus {
    return this._status;
  }

  set status(value: TaskStatus) {
    this._status = value;
  }

  get createdAt(): Date {
    return this._createAt;
  }

  set createdAt(value: Date) {
    this._createAt = value;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  set completedAt(value: Date | null) {
    this._completedAt = value;
  }

  get notes(): string {
    return this._notes;
  }

  set notes(value: string) {
    this._notes = value;
  }

  get feedback(): string {
    return this._feedback;
  }

  set feedback(value: string) {
    this._feedback = value;
  }

  get assigneeAttachment(): Attachment | undefined {
    return this._assigneeAttachment;
  }

  set assigneeAttachment(value: Attachment | undefined) {
    this._assigneeAttachment = value;
  }

  get assignerAttachment(): Attachment | undefined {
    return this._assignerAttachment;
  }

  set assignerAttachment(value: Attachment | undefined) {
    this._assignerAttachment = value;
  }

  toJSON() {
    return {
      id: this.id.toString(),
      title: this.title,
      description: this.description,
      department: this.department.toJSON(),
      assignee: this.assignee.toJSON(),
      assigner: this.assigner.toJSON(),
      approver: this.approver.toJSON(),
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      completedAt: this.completedAt.toISOString(),
      notes: this.notes,
      feedback: this.feedback,
      assigneeAttachment: this.assigneeAttachment.toJSON(),
      assignerAttachment: this.assignerAttachment.toJSON(),
    };
  }
}

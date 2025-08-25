import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Attachment } from 'src/files/domain/entities/attachment.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Department } from 'src/department/domain/entities/department.entity';

export enum TaskStatus {
  TODO = 'TODO',
  SEEN = 'SEEN',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PENDING_SUPERVISOR_REVIEW = 'PENDING_SUPERVISOR_REVIEW',
  COMPLETED = 'COMPLETED',
}

export enum TaskAssignmentType {
  INDIVIDUAL = 'INDIVIDUAL',
  DEPARTMENT = 'DEPARTMENT',
  SUB_DEPARTMENT = 'SUB_DEPARTMENT',
}

export interface TaskOptions {
  id?: string;
  title: string;
  description: string;
  assignee?: Employee;
  assigner: Admin | Supervisor;
  approver?: Admin | Supervisor;
  performer?: Admin | Supervisor | Employee;
  status: TaskStatus;
  assignmentType: TaskAssignmentType;
  targetDepartment?: Department;
  targetSubDepartment?: Department;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  notes?: string;
  feedback?: string;
  performerAttachment?: Attachment;
  assignerAttachment?: Attachment;
}

export class Task {
  private readonly _id: UUID;
  private _title: string;
  private _description: string;
  private _assignee?: Employee;
  private _assigner: Admin | Supervisor;
  private _approver?: Admin | Supervisor;
  private _performer?: Admin | Supervisor | Employee;
  private _status: TaskStatus;
  private _assignmentType: TaskAssignmentType;
  private _targetDepartment?: Department;
  private _targetSubDepartment?: Department;
  private _createAt: Date;
  private _updatedAt: Date;
  private _completedAt?: Date;
  private _notes?: string;
  private _feedback?: string;
  private _performerAttachment?: Attachment;
  private _assignerAttachment?: Attachment;

  private constructor(options: TaskOptions) {
    this._id = UUID.create(options.id);
    this._title = options.title;
    this._description = options.description;
    this._assignee = options.assignee;
    this._assigner = options.assigner;
    this._approver = options.approver;
    this._performer = options.performer;
    this._status = options.status;
    this._assignmentType = options.assignmentType;
    this._targetDepartment = options.targetDepartment;
    this._targetSubDepartment = options.targetSubDepartment;
    this._createAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._completedAt = options.completedAt ?? undefined;
    this._notes = options.notes ?? undefined;
    this._feedback = options.feedback ?? undefined;
    this._performerAttachment = options.performerAttachment;
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

  get assignee(): Employee {
    return this._assignee;
  }

  set assignee(value: Employee) {
    this._assignee = value;
  }

  get assigner(): Admin | Supervisor {
    return this._assigner;
  }

  set assigner(value: Admin | Supervisor) {
    this._assigner = value;
  }

  get approver(): Admin | Supervisor {
    return this._approver;
  }

  set approver(value: Admin | Supervisor) {
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

  get performerAttachment(): Attachment | undefined {
    return this._performerAttachment;
  }

  set performerAttachment(value: Attachment | undefined) {
    this._performerAttachment = value;
  }

  get assignerAttachment(): Attachment | undefined {
    return this._assignerAttachment;
  }

  set assignerAttachment(value: Attachment | undefined) {
    this._assignerAttachment = value;
  }

  get performer(): Admin | Supervisor | Employee | undefined {
    return this._performer;
  }

  set performer(value: Admin | Supervisor | Employee | undefined) {
    this._performer = value;
  }

  get assignmentType(): TaskAssignmentType {
    return this._assignmentType;
  }

  set assignmentType(value: TaskAssignmentType) {
    this._assignmentType = value;
  }

  get targetDepartment(): Department | undefined {
    return this._targetDepartment;
  }

  set targetDepartment(value: Department | undefined) {
    this._targetDepartment = value;
  }

  get targetSubDepartment(): Department | undefined {
    return this._targetSubDepartment;
  }

  set targetSubDepartment(value: Department | undefined) {
    this._targetSubDepartment = value;
  }

  toJSON(): any {
    return {
      id: this.id.toString(),
      title: this.title,
      description: this.description,
      assignee: this.assignee?.toJSON(),
      assigner: this.assigner?.toJSON(),
      approver: this.approver?.toJSON(),
      performer: this.performer?.toJSON(),
      status: this.status,
      assignmentType: this.assignmentType,
      targetDepartment: this.targetDepartment?.toJSON(),
      targetSubDepartment: this.targetSubDepartment?.toJSON(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      notes: this.notes,
      feedback: this.feedback,
      performerAttachment: this.performerAttachment?.toJSON(),
      assignerAttachment: this.assignerAttachment?.toJSON(),
    };
  }
}

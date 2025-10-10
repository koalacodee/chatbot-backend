import { UUID } from 'src/shared/value-objects/uuid.vo';
import { TaskAssignmentType, TaskPriority } from './task.entity';

export interface TaskPresetOptions {
  id?: string;
  name: string;
  title: string;
  description: string;
  dueDate?: Date;
  assigneeId?: string;
  assignerId: string;
  assignerRole: 'ADMIN' | 'SUPERVISOR';
  approverId?: string;
  assignmentType: TaskAssignmentType;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  priority?: TaskPriority;
  reminderInterval?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TaskPreset {
  private readonly _id: UUID;
  private _name: string;
  private _title: string;
  private _description: string;
  private _dueDate?: Date;
  private _assigneeId?: string;
  private _assignerId: UUID;
  private _assignerRole: 'ADMIN' | 'SUPERVISOR';
  private _approverId?: string;
  private _assignmentType: TaskAssignmentType;
  private _targetDepartmentId?: string;
  private _targetSubDepartmentId?: string;
  private _priority: TaskPriority;
  private _reminderInterval?: number;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(options: TaskPresetOptions) {
    this._id = UUID.create(options.id);
    this._name = options.name;
    this._title = options.title;
    this._description = options.description;
    this._dueDate = options.dueDate;
    this._assigneeId = options.assigneeId;
    this._assignerId = UUID.create(options.assignerId);
    this._assignerRole = options.assignerRole;
    this._approverId = options.approverId;
    this._assignmentType = options.assignmentType;
    this._targetDepartmentId = options.targetDepartmentId;
    this._targetSubDepartmentId = options.targetSubDepartmentId;
    this._priority = options.priority ?? TaskPriority.MEDIUM;
    this._reminderInterval = options.reminderInterval;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
  }

  static create(options: TaskPresetOptions): TaskPreset {
    return new TaskPreset(options);
  }

  get id(): UUID {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
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

  get dueDate(): Date | undefined {
    return this._dueDate;
  }

  set dueDate(value: Date | undefined) {
    this._dueDate = value;
  }

  get assigneeId(): string | undefined {
    return this._assigneeId;
  }

  set assigneeId(value: string | undefined) {
    this._assigneeId = value;
  }

  get assignerId(): UUID {
    return this._assignerId;
  }

  set assignerId(value: UUID) {
    this._assignerId = value;
  }

  get assignerRole(): 'ADMIN' | 'SUPERVISOR' {
    return this._assignerRole;
  }

  set assignerRole(value: 'ADMIN' | 'SUPERVISOR') {
    this._assignerRole = value;
  }

  get approverId(): string | undefined {
    return this._approverId;
  }

  set approverId(value: string | undefined) {
    this._approverId = value;
  }

  get assignmentType(): TaskAssignmentType {
    return this._assignmentType;
  }

  set assignmentType(value: TaskAssignmentType) {
    this._assignmentType = value;
  }

  get targetDepartmentId(): string | undefined {
    return this._targetDepartmentId;
  }

  set targetDepartmentId(value: string | undefined) {
    this._targetDepartmentId = value;
  }

  get targetSubDepartmentId(): string | undefined {
    return this._targetSubDepartmentId;
  }

  set targetSubDepartmentId(value: string | undefined) {
    this._targetSubDepartmentId = value;
  }

  get priority(): TaskPriority {
    return this._priority;
  }

  set priority(value: TaskPriority) {
    this._priority = value;
  }

  get reminderInterval(): number | undefined {
    return this._reminderInterval;
  }

  set reminderInterval(value: number | undefined) {
    this._reminderInterval = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  toJSON(): any {
    return {
      id: this._id.value,
      name: this._name,
      title: this._title,
      description: this._description,
      dueDate: this._dueDate?.toISOString(),
      assigneeId: this._assigneeId,
      assignerId: this._assignerId.value,
      assignerRole: this._assignerRole,
      approverId: this._approverId,
      assignmentType: this._assignmentType,
      targetDepartmentId: this._targetDepartmentId,
      targetSubDepartmentId: this._targetSubDepartmentId,
      priority: this._priority,
      reminderInterval: this._reminderInterval,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  static fromJSON(data: any): TaskPreset {
    return TaskPreset.create({
      id: data.id,
      name: data.name,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      assigneeId: data.assigneeId,
      assignerId: data.assignerId,
      assignerRole: data.assignerRole,
      approverId: data.approverId,
      assignmentType: data.assignmentType,
      targetDepartmentId: data.targetDepartmentId,
      targetSubDepartmentId: data.targetSubDepartmentId,
      priority: data.priority,
      reminderInterval: data.reminderInterval,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
    });
  }
}

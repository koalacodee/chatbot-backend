import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { TaskApprovalLevel } from '../value-objects/task-approval-level.vo';
import { User } from 'src/shared/entities/user.entity';

export enum TaskStatus {
  TODO = 'TODO',
  SEEN = 'SEEN',
  PENDING_REVIEW = 'PENDING_REVIEW',
  COMPLETED = 'COMPLETED',
}

export enum TaskAssignmentType {
  INDIVIDUAL = 'INDIVIDUAL',
  DEPARTMENT = 'DEPARTMENT',
  SUB_DEPARTMENT = 'SUB_DEPARTMENT',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface TaskOptions {
  id?: string;
  title: string;
  description: string;
  dueDate?: Date;
  assignee?: Employee;
  assigner?: Admin | Supervisor;
  approver?: Admin | Supervisor;
  creatorId: string;
  creator?: User;
  status: TaskStatus;
  assignmentType: TaskAssignmentType;
  priority: TaskPriority;
  targetDepartment?: Department;
  targetSubDepartment?: Department;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  reminderInterval?: number; // in milliseconds
  assigneeId?: string;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
}

export class Task {
  private readonly _id: UUID;
  private _title: string;
  private _description: string;
  private _dueDate?: Date;
  private _assignee?: Employee;
  private _assigner: Admin | Supervisor;
  private _approver?: Admin | Supervisor;
  private _creatorId: string;
  private _creator?: User;
  private _status: TaskStatus;
  private _assignmentType: TaskAssignmentType;
  private _priority: TaskPriority;
  private _targetDepartment?: Department;
  private _targetSubDepartment?: Department;
  private _createAt: Date;
  private _updatedAt: Date;
  private _completedAt?: Date;
  private _reminderInterval?: number; // in milliseconds
  private _assigneeId?: string;
  private _targetDepartmentId?: string;
  private _targetSubDepartmentId?: string;

  private constructor(options: TaskOptions) {
    this._id = UUID.create(options.id);
    this._title = options.title;
    this._description = options.description;
    this._dueDate = options.dueDate;
    this._assignee = options.assignee;
    this._assigner = options.assigner;
    this._approver = options.approver;
    this._creatorId = options.creatorId;
    this._creator = options.creator;
    this._status = options.status;
    this._assignmentType = options.assignmentType;
    this._priority = options.priority;
    this._targetDepartment = options.targetDepartment;
    this._targetSubDepartment = options.targetSubDepartment;
    this._createAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._completedAt = options.completedAt ?? undefined;
    this._reminderInterval = options.reminderInterval ?? undefined;
    this._assigneeId = options.assigneeId ?? undefined;
    this._targetDepartmentId = options.targetDepartmentId ?? undefined;
    this._targetSubDepartmentId = options.targetSubDepartmentId ?? undefined;
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

  get dueDate(): Date | undefined {
    return this._dueDate;
  }

  set dueDate(value: Date | undefined) {
    this._dueDate = value;
  }

  get assignee(): Employee | undefined {
    return this._assignee;
  }

  set assignee(value: Employee | undefined) {
    this._assignee = value;
  }

  get assigner(): Admin | Supervisor {
    return this._assigner;
  }

  set assigner(value: Admin | Supervisor) {
    this._assigner = value;
  }

  get approver(): Admin | Supervisor | undefined {
    return this._approver;
  }

  set approver(value: Admin | Supervisor | undefined) {
    this._approver = value;
  }

  get creatorId(): string {
    return this._creatorId;
  }

  set creatorId(value: string) {
    this._creatorId = value;
  }

  get creator(): User | undefined {
    return this._creator;
  }

  set creator(value: User | undefined) {
    this._creator = value;
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

  get reminderInterval(): number | undefined {
    return this._reminderInterval;
  }

  set reminderInterval(value: number | undefined) {
    this._reminderInterval = value;
  }

  get assigneeId(): string | undefined {
    return this._assigneeId;
  }

  set assigneeId(value: string | undefined) {
    this._assigneeId = value;
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

  get assignmentType(): TaskAssignmentType {
    return this._assignmentType;
  }

  set assignmentType(value: TaskAssignmentType) {
    this._assignmentType = value;
  }

  get priority(): TaskPriority {
    return this._priority;
  }

  set priority(value: TaskPriority) {
    this._priority = value;
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

  get approvalLevel(): TaskApprovalLevel {
    if (this.targetDepartmentId) {
      return TaskApprovalLevel.DEPARTMENT_LEVEL;
    }

    if (this.targetSubDepartmentId) {
      return TaskApprovalLevel.SUB_DEPARTMENT_LEVEL;
    }

    if (this.assigneeId) {
      return TaskApprovalLevel.EMPLOYEE_LEVEL;
    }

    throw new Error(
      'Task must have either targetDepartment, targetSubDepartment, or assignee',
    );
  }

  toJSON() {
    return {
      id: this.id.toString(),
      title: this.title,
      description: this.description,
      dueDate: this.dueDate?.toISOString(),
      assignee: this.assignee?.toJSON(),
      assigner: this.assigner?.toJSON(),
      approver: this.approver?.toJSON(),
      creatorId: this.creatorId,
      creator: this.creator?.withoutPassword(),
      status: this.status,
      assignmentType: this.assignmentType,
      priority: this.priority,
      targetDepartment: this.targetDepartment?.toJSON(),
      targetSubDepartment: this.targetSubDepartment?.toJSON(),
      approvalLevel: this.approvalLevel,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      reminderInterval: this.reminderInterval,
      assigneeId: this.assigneeId,
      targetDepartmentId: this.targetDepartmentId,
      targetSubDepartmentId: this.targetSubDepartmentId,
    };
  }
}

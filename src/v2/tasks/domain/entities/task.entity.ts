import type { Admin } from '@/admin/domain/entities/admin.entity';
import type { Department } from '@/department/domain/entities/department.entity';
import type { Employee } from '@/employee/domain/entities/employee.entity';
import { User } from '@/shared/entities/user.entity';
import type { Supervisor } from '@/supervisor/domain/entities/supervisor.entity';
import { uuidv7 } from 'uuidv7';

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

export interface TaskReminder {
  id: string;
  name: string;
  reminderDate: Date;
  reminderInterval: number;
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskReminderOptions {
  id?: string;
  name: string;
  reminderDate: Date;
  reminderInterval: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskOptions {
  id?: string;
  title: string;
  description: string;
  dueDate?: Date;
  assignee?: Employee;
  assigner?: Admin | Supervisor;
  assignerId?: string;
  approver?: Admin | Supervisor;
  approverId?: string;
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
  reminders?: TaskReminderOptions[];
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  assigneeName?: string;
  daysBeforeDeadlineReminder?: number;
}

export class Task {
  private readonly _id: string;
  private _title: string;
  private _description: string;
  private _dueDate?: Date;
  private _assignee?: Employee;
  private _assigner?: Admin | Supervisor;
  private _assignerId?: string;
  private _approver?: Admin | Supervisor;
  private _approverId?: string;
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
  private _assigneeId?: string;
  private _targetDepartmentId?: string;
  private _targetSubDepartmentId?: string;
  private _reminders?: TaskReminder[];
  // Either assignee name or department name or sub-department name based on assignment type, used for display purposes
  private _assigneeName?: string;
  private _daysBeforeDeadlineReminder?: number;

  private constructor(options: TaskOptions) {
    this._id = options.id ?? uuidv7();
    this._title = options.title;
    this._description = options.description;
    this._dueDate = options.dueDate;
    this._assignee = options.assignee;
    this._assigner = options.assigner;
    this._assignerId = options.assignerId ?? undefined;
    this._approver = options.approver;
    this._approverId = options.approverId ?? undefined;
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
    this._assigneeId = options.assigneeId ?? undefined;
    this._targetDepartmentId = options.targetDepartmentId ?? undefined;
    this._targetSubDepartmentId = options.targetSubDepartmentId ?? undefined;
    this._daysBeforeDeadlineReminder = options.daysBeforeDeadlineReminder ?? undefined;
    this._reminders =
      options.reminders?.map((reminder) => ({
        id: reminder.id ?? uuidv7(),
        name: reminder.name,
        reminderDate: reminder.reminderDate,
        reminderInterval: reminder.reminderInterval,
        taskId: this.id,
        createdAt: reminder.createdAt ?? new Date(),
        updatedAt: reminder.updatedAt ?? new Date(),
      })) ?? undefined;
    this._assigneeName = options.assigneeName ?? undefined;
  }

  static create(options: TaskOptions): Task {
    return new Task(options);
  }

  get id(): string {
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

  get assigner(): Admin | Supervisor | undefined {
    return this._assigner;
  }

  get assignerId(): string | undefined {
    return this._assignerId;
  }

  set assignerId(value: string | undefined) {
    this._assignerId = value;
  }

  set assigner(value: Admin | Supervisor | undefined) {
    this._assigner = value;
  }

  get approver(): Admin | Supervisor | undefined {
    return this._approver;
  }

  get approverId(): string | undefined {
    return this._approverId;
  }

  set approverId(value: string | undefined) {
    this._approverId = value;
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

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  set completedAt(value: Date | undefined) {
    this._completedAt = value;
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

  get reminders(): TaskReminder[] | undefined {
    return this._reminders;
  }

  addToReminders(reminder: TaskReminderOptions | TaskReminderOptions[]) {
    if (Array.isArray(reminder)) {
      this._reminders?.push(
        ...reminder.map((reminder) => ({
          id: reminder.id ?? uuidv7(),
          name: reminder.name,
          reminderDate: reminder.reminderDate,
          reminderInterval: reminder.reminderInterval,
          taskId: this.id,
          createdAt: reminder.createdAt ?? new Date(),
          updatedAt: reminder.updatedAt ?? new Date(),
        })),
      );
    } else {
      this._reminders?.push({
        id: reminder.id ?? uuidv7(),
        name: reminder.name,
        reminderDate: reminder.reminderDate,
        reminderInterval: reminder.reminderInterval,
        taskId: this.id,
        createdAt: reminder.createdAt ?? new Date(),
        updatedAt: reminder.updatedAt ?? new Date(),
      });
    }
  }

  removeReminder(reminderIds: string[]) {
    const set = new Set(reminderIds);
    this._reminders = this._reminders?.filter(
      (reminder) => !set.has(reminder.id),
    );
  }

  set reminders(value: TaskReminder[] | undefined) {
    this._reminders = value;
  }

  get assigneeName(): string | undefined {
    return this._assigneeName;
  }

  set assigneeName(value: string | undefined) {
    this._assigneeName = value;
  }

  get daysBeforeDeadlineReminder(): number | undefined {
    return this._daysBeforeDeadlineReminder;
  }

  set daysBeforeDeadlineReminder(value: number | undefined) {
    this._daysBeforeDeadlineReminder = value;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate,
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
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      assigneeId: this.assigneeId,
      targetDepartmentId: this.targetDepartmentId,
      targetSubDepartmentId: this.targetSubDepartmentId,
      assigneeName: this.assigneeName,
      reminders: this.reminders,
      daysBeforeDeadlineReminder: this.daysBeforeDeadlineReminder,
    };
  }
}

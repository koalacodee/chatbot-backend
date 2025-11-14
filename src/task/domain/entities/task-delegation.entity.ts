import { Department } from "src/department/domain/entities/department.entity";
import { Employee } from "src/employee/domain/entities/employee.entity";
import { UUID } from "src/shared/value-objects/uuid.vo";
import { Supervisor } from "src/supervisor/domain/entities/supervisor.entity";
import { Task, TaskAssignmentType, TaskStatus } from "./task.entity";

export interface TaskDelegationOptions {
  id?: string;
  taskId: string;
  task?: Task;
  assignee?: Employee;
  assigneeId?: string;
  targetSubDepartment?: Department;
  targetSubDepartmentId?: string;
  delegator?: Supervisor;
  delegatorId: string;
  status: TaskStatus;
  assignmentType: TaskAssignmentType;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

export class TaskDelegation {
  private readonly _id: UUID;
  private _taskId: UUID;
  private _task?: Task;
  private _assignee?: Employee;
  private _assigneeId?: string;
  private _targetSubDepartment?: Department;
  private _targetSubDepartmentId?: UUID;
  private _delegator?: Supervisor;
  private _delegatorId: UUID;
  private _status: TaskStatus;
  private _assignmentType: TaskAssignmentType;
  private _createAt: Date;
  private _updatedAt: Date;
  private _completedAt?: Date;

  private constructor(options: TaskDelegationOptions) {
    this._id = UUID.create(options.id);
    this._taskId = UUID.create(options.taskId);
    this._task = options.task;
    this._assignee = options.assignee;
    this._assigneeId = options.assigneeId;
    this._targetSubDepartment = options.targetSubDepartment;
    this._targetSubDepartmentId = options.targetSubDepartmentId ? UUID.create(options.targetSubDepartmentId) : undefined;
    this._delegator = options.delegator;
    this._delegatorId = UUID.create(options.delegatorId);
    this._status = options.status;
    this._assignmentType = options.assignmentType;
    this._createAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._completedAt = options.completedAt;
  }

  static create(options: TaskDelegationOptions): TaskDelegation {
    return new TaskDelegation(options);
  }

  get id(): string {
    return this._id.value;
  }

  get taskId(): string {
    return this._taskId.value;
  }

  get task(): Task | undefined {
    return this._task;
  }
  set task(task: Task | undefined) {
    this._task = task;
  }

  get assignee(): Employee | undefined {
    return this._assignee;
  }
  set assignee(value: Employee | undefined) {
    this._assignee = value;
  }

  get assigneeId(): string | undefined {
    return this._assigneeId;
  }
  set assigneeId(value: string | undefined) {
    this._assigneeId = value;
  }

  get targetSubDepartment(): Department {
    return this._targetSubDepartment;
  }
  set targetSubDepartment(department: Department) {
    this._targetSubDepartment = department;
  }

  get targetSubDepartmentId(): string {
    return this._targetSubDepartmentId.value;
  }
  set targetSubDepartmentId(id: string) {
    this._targetSubDepartmentId = UUID.create(id);
  }

  get delegator(): Supervisor {
    return this._delegator;
  }
  set delegator(delegator: Supervisor) {
    this._delegator = delegator;
  }

  get delegatorId(): string {
    return this._delegatorId.value;
  }
  set delegatorId(id: string) {
    this._delegatorId = UUID.create(id);
  }

  get status(): TaskStatus {
    return this._status;
  }
  set status(status: TaskStatus) {
    this._status = status;
  }

  get assignmentType(): TaskAssignmentType {
    return this._assignmentType;
  }
  set assignmentType(type: TaskAssignmentType) {
    this._assignmentType = type;
  }

  get createdAt(): Date {
    return this._createAt;
  }
  set createdAt(date: Date) {
    this._createAt = date;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
  set updatedAt(date: Date) {
    this._updatedAt = date;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }
  set completedAt(date: Date | undefined) {
    this._completedAt = date;
  }

  toJSON() {
    return {
      id: this.id,
      taskId: this.taskId,
      task: this.task ? (typeof this.task["toJSON"] === "function" ? this.task.toJSON() : this.task) : undefined,
      assignee: this.assignee ? (typeof this.assignee["toJSON"] === "function" ? this.assignee.toJSON() : this.assignee) : undefined,
      assigneeId: this.assigneeId,
      targetSubDepartment: this.targetSubDepartment ? (typeof this.targetSubDepartment["toJSON"] === "function" ? this.targetSubDepartment.toJSON() : this.targetSubDepartment) : undefined,
      targetSubDepartmentId: this.targetSubDepartmentId,
      delegator: this.delegator ? (typeof this.delegator["toJSON"] === "function" ? this.delegator.toJSON() : this.delegator) : undefined,
      delegatorId: this.delegatorId,
      status: this.status,
      assignmentType: this.assignmentType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
    };
  }
}
import type { Department } from "@/department/domain/entities/department.entity";
import type { Employee } from "@/employee/domain/entities/employee.entity";
import type { Supervisor } from "@/supervisor/domain/entities/supervisor.entity";
import type { Task, TaskAssignmentType, TaskStatus } from "./task.entity";
import { uuidv7 } from "uuidv7";

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
	private readonly _id: string;
	private _taskId: string;
	private _task?: Task;
	private _assignee?: Employee;
	private _assigneeId?: string;
	private _targetSubDepartment?: Department;
	private _targetSubDepartmentId?: string;
	private _delegator?: Supervisor;
	private _delegatorId: string;
	private _status: TaskStatus;
	private _assignmentType: TaskAssignmentType;
	private _createAt: Date;
	private _updatedAt: Date;
	private _completedAt?: Date;

	private constructor(options: TaskDelegationOptions) {
		this._id = options.id ?? uuidv7();
		this._taskId = options.taskId;
		this._task = options.task;
		this._assignee = options.assignee;
		this._assigneeId = options.assigneeId;
		this._targetSubDepartment = options.targetSubDepartment;
		this._targetSubDepartmentId = options.targetSubDepartmentId;
		this._delegator = options.delegator;
		this._delegatorId = options.delegatorId;
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
		return this._id;
	}

	get taskId(): string {
		return this._taskId;
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

	get targetSubDepartment(): Department | undefined {
		return this._targetSubDepartment;
	}
	set targetSubDepartment(department: Department | undefined) {
		this._targetSubDepartment = department;
	}

	get targetSubDepartmentId(): string | undefined {
		return this._targetSubDepartmentId;
	}
	set targetSubDepartmentId(id: string | undefined) {
		this._targetSubDepartmentId = id;
	}

	get delegator(): Supervisor | undefined {
		return this._delegator;
	}
	set delegator(delegator: Supervisor | undefined) {
		this._delegator = delegator;
	}

	get delegatorId(): string {
		return this._delegatorId;
	}
	set delegatorId(id: string) {
		this._delegatorId = id;
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
			task: this.task?.toJSON(),
			assignee: this.assignee?.toJSON(),
			assigneeId: this.assigneeId,
			targetSubDepartment: this.targetSubDepartment?.toJSON(),
			targetSubDepartmentId: this.targetSubDepartmentId,
			delegator: this.delegator?.toJSON(),
			delegatorId: this.delegatorId,
			status: this.status,
			assignmentType: this.assignmentType,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			completedAt: this.completedAt,
		};
	}
}

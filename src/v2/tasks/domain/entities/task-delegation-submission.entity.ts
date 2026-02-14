import type { Admin } from "@/admin/domain/entities/admin.entity";
import type { Employee } from "@/employee/domain/entities/employee.entity";
import type { Supervisor } from "@/supervisor/domain/entities/supervisor.entity";
import type { Task } from "./task.entity";
import type { TaskDelegation } from "./task-delegation.entity";
import { TaskSubmissionStatus } from "./task-submission.entity";
import { uuidv7 } from "uuidv7";

export interface TaskDelegationSubmissionOptions {
	id?: string;
	delegationId: string;
	delegation?: TaskDelegation;
	taskId: string;
	task?: Task;
	performerId: string;
	performerType: "admin" | "supervisor" | "employee";
	performerName?: string;
	performer?: Admin | Supervisor | Employee;
	notes?: string;
	feedback?: string;
	status: TaskSubmissionStatus;
	submittedAt?: Date;
	reviewedAt?: Date;
	reviewedBy?: Admin | Supervisor;
	reviewedByAdminId?: string;
	reviewedBySupervisorId?: string;
	forwarded?: boolean;
	forwardedMessage?: string;
	forwardedToSupervisorId?: string;
}

export class TaskDelegationSubmission {
	private readonly _id: string;
	private _delegationId: string;
	private _delegation?: TaskDelegation;
	private _taskId: string;
	private _task?: Task;
	private _performerId: string;
	private _performerType: "admin" | "supervisor" | "employee";
	private _performerName?: string;
	private _performer?: Admin | Supervisor | Employee;
	private _notes?: string;
	private _feedback?: string;
	private _status: TaskSubmissionStatus;
	private _submittedAt: Date;
	private _reviewedAt?: Date;
	private _reviewedBy?: Admin | Supervisor;
	private _reviewedByAdminId?: string;
	private _reviewedBySupervisorId?: string;
	private _forwarded: boolean;
	private _forwardedMessage?: string;
	private _forwardedToSupervisorId?: string;

	private constructor(options: TaskDelegationSubmissionOptions) {
		this._id = options.id ?? uuidv7();
		this._delegationId = options.delegationId;
		this._delegation = options.delegation;
		this._taskId = options.taskId;
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
		this._reviewedByAdminId = options.reviewedByAdminId ?? undefined;
		this._reviewedBySupervisorId = options.reviewedBySupervisorId ?? undefined;
		this._forwarded = options.forwarded ?? false;
		this._forwardedMessage = options.forwardedMessage ?? undefined;
		this._forwardedToSupervisorId = options.forwardedToSupervisorId ?? undefined;
	}

	static create(
		options: TaskDelegationSubmissionOptions,
	): TaskDelegationSubmission {
		return new TaskDelegationSubmission(options);
	}

	get id(): string {
		return this._id;
	}

	get taskId(): string {
		return this._taskId;
	}

	set taskId(value: string) {
		this._taskId = value;
	}

	get task(): Task | undefined {
		return this._task;
	}

	set task(value: Task | undefined) {
		this._task = value;
	}

	get delegation(): TaskDelegation | undefined {
		return this._delegation;
	}

	get delegationId(): string {
		return this._delegationId;
	}

	set delegationId(value: string) {
		this._delegationId = value;
	}

	set delegation(value: TaskDelegation | undefined) {
		this._delegation = value;
	}

	get performerId(): string {
		return this._performerId;
	}

	set performerId(value: string) {
		this._performerId = value;
	}

	get performerType(): "admin" | "supervisor" | "employee" {
		return this._performerType;
	}

	set performerType(value: "admin" | "supervisor" | "employee") {
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

	get reviewedByAdminId(): string | undefined {
		return this._reviewedByAdminId;
	}
	set reviewedByAdminId(value: string | undefined) {
		this._reviewedByAdminId = value;
	}

	get reviewedBySupervisorId(): string | undefined {
		return this._reviewedBySupervisorId;
	}
	set reviewedBySupervisorId(value: string | undefined) {
		this._reviewedBySupervisorId = value;
	}

	get forwarded(): boolean {
		return this._forwarded;
	}

	set forwarded(value: boolean) {
		this._forwarded = value;
	}

	get forwardedMessage(): string | undefined {
		return this._forwardedMessage;
	}

	set forwardedMessage(value: string | undefined) {
		this._forwardedMessage = value;
	}

	get forwardedToSupervisorId(): string | undefined {
		return this._forwardedToSupervisorId;
	}

	set forwardedToSupervisorId(value: string | undefined) {
		this._forwardedToSupervisorId = value;
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

	toJSON() {
		return {
			id: this.id,
			delegationId: this.delegationId,
			delegation: this.delegation?.toJSON(),
			taskId: this.taskId,
			task: this.task?.toJSON(),
			performerId: this.performerId,
			performerType: this.performerType,
			performerName: this.performerName,
			performer: this.performer?.toJSON(),
			notes: this.notes,
			feedback: this.feedback,
			status: this.status,
			submittedAt: this.submittedAt,
			reviewedAt: this.reviewedAt,
			reviewedBy: this.reviewedBy?.toJSON(),
			reviewedByAdminId: this.reviewedByAdminId,
			reviewedBySupervisorId: this.reviewedBySupervisorId,
			forwarded: this.forwarded,
			forwardedMessage: this.forwardedMessage,
			forwardedToSupervisorId: this.forwardedToSupervisorId,
		};
	}
}

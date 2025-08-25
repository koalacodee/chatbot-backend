import { Admin } from 'src/admin/domain/entities/admin.entity';
import { User } from 'src/shared/entities/user.entity';
import { Email } from 'src/shared/value-objects/email.vo';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

interface EmployeeRequestOptions {
  id?: string;
  requestedBySupervisor: Supervisor;
  newEmployeeEmail: Email;
  newEmployeeFullName: string;
  newEmployeeUsername: string;
  newEmployeeJobTitle: string;
  temporaryPassword: string;
  newEmployeeId?: string;
  newEmployeeDesignation?: string;
  status: RequestStatus;
  createdAt?: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  resolvedByAdmin?: Admin;
  rejectionReason?: string;
  acknowledgedBySupervisor?: boolean;
}

export class EmployeeRequest {
  private _id: UUID;
  private _requestedBySupervisor: Supervisor;
  private readonly _newEmployeeEmail: Email;
  private readonly _newEmployeeFullName: string;
  private readonly _newEmployeeUsername: string;
  private readonly _newEmployeeJobTitle: string;
  private readonly _temporaryPassword: string;
  private readonly _newEmployeeDesignation?: string;
  private readonly _newEmployeeId?: string;
  private _status: RequestStatus;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _resolvedAt?: Date;
  private _resolvedByAdmin?: Admin;
  private _rejectionReason?: string;
  private _acknowledgedBySupervisor: boolean;

  private constructor(options: EmployeeRequestOptions) {
    this._id = UUID.create(options.id);
    this._requestedBySupervisor = options.requestedBySupervisor;
    this._newEmployeeEmail = options.newEmployeeEmail;
    this._newEmployeeFullName = options.newEmployeeFullName;
    this._newEmployeeUsername = options.newEmployeeUsername;
    this._newEmployeeJobTitle = options.newEmployeeJobTitle;
    this._temporaryPassword = options.temporaryPassword;
    this._newEmployeeDesignation = options.newEmployeeDesignation;
    this._newEmployeeId = options.newEmployeeId;
    this._status = options.status;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._resolvedAt = options.resolvedAt;
    this._resolvedByAdmin = options.resolvedByAdmin;
    this._rejectionReason = options.rejectionReason;
    this._acknowledgedBySupervisor = options.acknowledgedBySupervisor ?? false;
  }

  public static create(options: EmployeeRequestOptions): EmployeeRequest {
    return new EmployeeRequest(options);
  }

  public get id(): string {
    return this._id.value;
  }

  public get requestedBySupervisor(): Supervisor {
    return this._requestedBySupervisor;
  }

  public set requestedBySupervisor(value: Supervisor) {
    this._requestedBySupervisor = value;
  }

  public get newEmployeeEmail(): Email {
    return this._newEmployeeEmail;
  }

  public get newEmployeeFullName(): string {
    return this._newEmployeeFullName;
  }

  public get newEmployeeUsername(): string {
    return this._newEmployeeUsername;
  }

  public get newEmployeeJobTitle(): string {
    return this._newEmployeeJobTitle;
  }

  public get temporaryPassword(): string {
    return this._temporaryPassword;
  }

  public get newEmployeeDesignation(): string | undefined {
    return this._newEmployeeDesignation;
  }

  public get newEmployeeId(): string | undefined {
    return this._newEmployeeId;
  }

  public get status(): RequestStatus {
    return this._status;
  }

  public set status(value: RequestStatus) {
    this._status = value;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public set createdAt(value: Date) {
    this._createdAt = value;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  public get resolvedAt(): Date | undefined {
    return this._resolvedAt;
  }

  public set resolvedAt(value: Date | undefined) {
    this._resolvedAt = value;
  }

  public get resolvedByAdmin(): Admin | undefined {
    return this._resolvedByAdmin;
  }

  public set resolvedByAdmin(value: Admin | undefined) {
    this._resolvedByAdmin = value;
  }

  public get rejectionReason(): string | undefined {
    return this._rejectionReason;
  }

  public set rejectionReason(value: string | undefined) {
    this._rejectionReason = value;
  }

  public get acknowledgedBySupervisor(): boolean {
    return this._acknowledgedBySupervisor;
  }

  public set acknowledgedBySupervisor(value: boolean) {
    this._acknowledgedBySupervisor = value;
  }

  public toJSON(): EmployeeRequestOptions {
    return {
      id: this._id.value,
      requestedBySupervisor: this._requestedBySupervisor,
      newEmployeeEmail: this._newEmployeeEmail,
      newEmployeeFullName: this._newEmployeeFullName,
      newEmployeeUsername: this._newEmployeeUsername,
      newEmployeeJobTitle: this._newEmployeeJobTitle,
      newEmployeeId: this._newEmployeeId,
      temporaryPassword: this._temporaryPassword,
      newEmployeeDesignation: this._newEmployeeDesignation,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      resolvedAt: this._resolvedAt,
      resolvedByAdmin: this._resolvedByAdmin,
      rejectionReason: this._rejectionReason,
      acknowledgedBySupervisor: this._acknowledgedBySupervisor,
    };
  }
}

import { User } from 'src/shared/entities/user.entity';
import { Email } from 'src/shared/value-objects/email.vo';
import { UUID } from 'src/shared/value-objects/uuid.vo';

enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

interface EmployeeRequestOptions {
  id?: string;
  requestedBySupervisor: User;
  newEmployeeEmail: Email;
  newEmployeeFullName?: string;
  newEmployeeDesignation?: string;
  status: RequestStatus;
  createdAt?: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  resolvedByAdmin?: User;
  rejectionReason?: string;
  acknowledgedBySupervisor?: boolean;
}

export class EmployeeRequest {
  private _id: UUID;
  private _requestedBySupervisor: User;
  private _newEmployeeEmail: Email;
  private _newEmployeeFullName?: string;
  private _newEmployeeDesignation?: string;
  private _status: RequestStatus;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _resolvedAt?: Date;
  private _resolvedByAdmin?: User;
  private _rejectionReason?: string;
  private _acknowledgedBySupervisor: boolean;

  private constructor(options: EmployeeRequestOptions) {
    this._id = UUID.create(options.id);
    this._requestedBySupervisor = options.requestedBySupervisor;
    this._newEmployeeEmail = options.newEmployeeEmail;
    this._newEmployeeFullName = options.newEmployeeFullName;
    this._newEmployeeDesignation = options.newEmployeeDesignation;
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

  public get requestedBySupervisor(): User {
    return this._requestedBySupervisor;
  }

  public set requestedBySupervisor(value: User) {
    this._requestedBySupervisor = value;
  }

  public get newEmployeeEmail(): Email {
    return this._newEmployeeEmail;
  }

  public set newEmployeeEmail(value: Email) {
    this._newEmployeeEmail = value;
  }

  public get newEmployeeFullName(): string | undefined {
    return this._newEmployeeFullName;
  }

  public set newEmployeeFullName(value: string | undefined) {
    this._newEmployeeFullName = value;
  }

  public get newEmployeeDesignation(): string | undefined {
    return this._newEmployeeDesignation;
  }

  public set newEmployeeDesignation(value: string | undefined) {
    this._newEmployeeDesignation = value;
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

  public get resolvedByAdmin(): User | undefined {
    return this._resolvedByAdmin;
  }

  public set resolvedByAdmin(value: User | undefined) {
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

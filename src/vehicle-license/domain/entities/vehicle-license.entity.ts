import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Vehicle } from '../../../vehicle/domain/entities/vehicle.entity';

export enum VehicleLicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
}

interface VehicleLicenseOptions {
  id?: string;
  vehicle: Vehicle;
  licenseNumber: string;
  issueDate: Date;
  expiryDate: Date;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  status: VehicleLicenseStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class VehicleLicense {
  private readonly _id: UUID;
  private _vehicle: Vehicle;
  private _licenseNumber: string;
  private _issueDate: Date;
  private _expiryDate: Date;
  private _insurancePolicyNumber?: string;
  private _insuranceExpiryDate?: Date;
  private _status: VehicleLicenseStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(options: VehicleLicenseOptions) {
    this._id = UUID.create(options.id);
    this._vehicle = options.vehicle;
    this._licenseNumber = options.licenseNumber;
    this._issueDate = options.issueDate;
    this._expiryDate = options.expiryDate;
    this._insurancePolicyNumber = options.insurancePolicyNumber;
    this._insuranceExpiryDate = options.insuranceExpiryDate;
    this._status = options.status;
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
  }

  public static create(options: VehicleLicenseOptions): VehicleLicense {
    return new VehicleLicense(options);
  }

  get id(): UUID {
    return this._id;
  }

  get vehicle(): Vehicle {
    return this._vehicle;
  }

  get licenseNumber(): string {
    return this._licenseNumber;
  }

  get issueDate(): Date {
    return this._issueDate;
  }

  get insurancePolicyNumber(): string | undefined {
    return this._insurancePolicyNumber;
  }

  get insuranceExpiryDate(): Date | undefined {
    return this._insuranceExpiryDate;
  }

  get status(): VehicleLicenseStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get expiryDate(): Date {
    return this._expiryDate;
  }

  set expiryDate(expiryDate: Date) {
    this._expiryDate = expiryDate;
    this._updatedAt = new Date();
  }

  set vehicle(vehicle: Vehicle) {
    this._vehicle = vehicle;
    this._updatedAt = new Date();
  }

  set licenseNumber(licenseNumber: string) {
    this._licenseNumber = licenseNumber;
    this._updatedAt = new Date();
  }

  set issueDate(issueDate: Date) {
    this._issueDate = issueDate;
    this._updatedAt = new Date();
  }

  set insurancePolicyNumber(insurancePolicyNumber: string | undefined) {
    this._insurancePolicyNumber = insurancePolicyNumber;
    this._updatedAt = new Date();
  }

  set insuranceExpiryDate(insuranceExpiryDate: Date | undefined) {
    this._insuranceExpiryDate = insuranceExpiryDate;
    this._updatedAt = new Date();
  }

  set status(status: VehicleLicenseStatus) {
    this._status = status;
    this._updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this._id.toString(),
      vehicle: this._vehicle,
      licenseNumber: this._licenseNumber,
      issueDate: this._issueDate,
      expiryDate: this._expiryDate,
      insurancePolicyNumber: this._insurancePolicyNumber,
      insuranceExpiryDate: this._insuranceExpiryDate,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

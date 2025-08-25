import { User } from '@prisma/client';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { VehicleLicense } from 'src/vehicle-license/domain/entities/vehicle-license.entity';

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

interface VehicleOptions {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  vin: string;
  status: VehicleStatus;
  driver: User;
  license: VehicleLicense;
  createdAt?: Date;
  updatedAt?: Date;
  notes?: string;
  nextMaintenanceDate?: Date;
}

export class Vehicle {
  private readonly _id: UUID;
  private _make: string;
  private _model: string;
  private _year: number;
  private _plateNumber: string;
  private _vin: string;
  private _status: VehicleStatus;
  private _driver: User;
  private _license: VehicleLicense;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _notes?: string;
  private _nextMaintenanceDate?: Date;

  private constructor(options: VehicleOptions) {
    this._id = UUID.create(options.id);
    this._make = options.make;
    this._model = options.model;
    this._year = options.year;
    this._plateNumber = options.plateNumber;
    this._vin = options.vin;
    this._status = options.status;
    this._driver = options.driver;
    this._license = options.license;
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._notes = options.notes;
    this._nextMaintenanceDate = options.nextMaintenanceDate;
  }

  public static create(options: VehicleOptions): Vehicle {
    return new Vehicle(options);
  }

  // Getters
  get id(): UUID {
    return this._id;
  }
  get make(): string {
    return this._make;
  }
  get model(): string {
    return this._model;
  }
  get year(): number {
    return this._year;
  }
  get plateNumber(): string {
    return this._plateNumber;
  }
  get vin(): string {
    return this._vin;
  }
  get status(): VehicleStatus {
    return this._status;
  }
  get driver(): User {
    return this._driver;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get notes(): string | undefined {
    return this._notes;
  }
  get nextMaintenanceDate(): Date | undefined {
    return this._nextMaintenanceDate;
  }
  get license(): VehicleLicense {
    return this._license;
  }

  // Setters
  set make(value: string) {
    this._make = value;
    this._updatedAt = new Date();
  }
  set model(value: string) {
    this._model = value;
    this._updatedAt = new Date();
  }
  set year(value: number) {
    this._year = value;
    this._updatedAt = new Date();
  }
  set plateNumber(value: string) {
    this._plateNumber = value;
    this._updatedAt = new Date();
  }
  set vin(value: string) {
    this._vin = value;
    this._updatedAt = new Date();
  }
  set status(value: VehicleStatus) {
    this._status = value;
    this._updatedAt = new Date();
  }
  set driver(value: User) {
    this._driver = value;
    this._updatedAt = new Date();
  }
  set notes(value: string | undefined) {
    this._notes = value;
    this._updatedAt = new Date();
  }
  set nextMaintenanceDate(value: Date | undefined) {
    this._nextMaintenanceDate = value;
    this._updatedAt = new Date();
  }
  set license(license: VehicleLicense) {
    this._license = license;
    this._updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this._id.toString(),
      make: this._make,
      model: this._model,
      year: this._year,
      plateNumber: this._plateNumber,
      vin: this._vin,
      status: this._status,
      driver: this._driver,
      license: this._license,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      notes: this._notes,
      nextMaintenanceDate: this._nextMaintenanceDate,
    };
  }
}

import { User } from 'src/shared/entities/user.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Vehicle } from 'src/vehicle/domain/entities/vehicle.entity';
import { Violation } from 'src/violation/domain/entities/violation.entity';

interface DriverProps {
  id?: string;
  userId: string;
  user?: User;
  supervisorId: string;
  licensingNumber: string;
  drivingLicenseExpiry: Date;
  vehicles?: Vehicle[];
  violations?: Violation[];
}

export class Driver {
  private readonly _id: UUID;
  private _userId: UUID;
  private _user?: User;
  private _supervisorId: UUID;
  private _licensingNumber: string;
  private _drivingLicenseExpiry: Date;
  private _vehicles?: Vehicle[];
  private _violations?: Violation[];

  private constructor(props: DriverProps) {
    this._id = UUID.create(props.id);
    this._userId = UUID.create(props.userId);
    this._user = props.user;
    this._supervisorId = UUID.create(props.supervisorId);
    this._licensingNumber = props.licensingNumber;
    this._drivingLicenseExpiry = props.drivingLicenseExpiry;
    this._vehicles = props.vehicles;
    this._violations = props.violations;
  }

  static create(props: DriverProps): Driver {
    return new Driver(props);
  }

  get id(): UUID {
    return this._id;
  }

  get userId(): UUID {
    return this._userId;
  }

  set userId(value: UUID) {
    this._userId = value;
  }

  get user(): User | undefined {
    return this._user;
  }

  set user(value: User | undefined) {
    this._user = value;
  }

  get supervisorId(): UUID {
    return this._supervisorId;
  }

  set supervisorId(value: UUID) {
    this._supervisorId = value;
  }

  get licensingNumber(): string {
    return this._licensingNumber;
  }

  set licensingNumber(value: string) {
    this._licensingNumber = value;
  }

  get drivingLicenseExpiry(): Date {
    return this._drivingLicenseExpiry;
  }

  set drivingLicenseExpiry(value: Date) {
    this._drivingLicenseExpiry = value;
  }

  get vehicles(): Vehicle[] | undefined {
    return this._vehicles;
  }

  set vehicles(value: Vehicle[] | undefined) {
    this._vehicles = value;
  }

  get violations(): Violation[] | undefined {
    return this._violations;
  }

  set violations(value: Violation[] | undefined) {
    this._violations = value;
  }

  toJSON(): DriverProps {
    return {
      id: this._id.value,
      userId: this._userId.value,
      user: this._user,
      supervisorId: this._supervisorId.toString(),
      licensingNumber: this._licensingNumber,
      drivingLicenseExpiry: this._drivingLicenseExpiry,
      vehicles: this._vehicles,
      violations: this._violations,
    };
  }

  static async fromJSON(props: Record<string, any>): Promise<Driver> {
    return Driver.create({
      id: props.id,
      userId: props.userId,
      user: props.user ? await User.create(props.user) : undefined,
      supervisorId: props.supervisorId,
      licensingNumber: props.licensingNumber,
      drivingLicenseExpiry: new Date(props.drivingLicenseExpiry),
      vehicles: props.vehicles ? props.vehicles.map(Vehicle.create) : undefined,
      violations: props.violations
        ? props.violations.map(Violation.create)
        : undefined,
    });
  }
}

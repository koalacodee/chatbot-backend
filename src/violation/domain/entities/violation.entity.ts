import { User } from 'src/shared/entities/user.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Vehicle } from 'src/vehicle/domain/entities/vehicle.entity';
import { ViolationRule } from './violation-rule.entity';

export interface ViolationOptions {
  id: string;
  driver: User;
  vehicle: Vehicle;
  rule: ViolationRule;
  description: string;
  amount: number;
  isPaid: boolean;
  triggerEventId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Violation {
  private readonly _id: UUID;
  private _driver: User;
  private _vehicle: Vehicle;
  private _rule: ViolationRule;
  private _description: string;
  private _amount: number;
  private _isPaid: boolean;
  private _triggerEventId: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(options: ViolationOptions) {
    this._id = UUID.create(options.id);
    this._driver = options.driver;
    this._vehicle = options.vehicle;
    this._rule = options.rule;
    this._description = options.description;
    this._amount = options.amount;
    this._isPaid = options.isPaid;
    this._triggerEventId = options.triggerEventId;
    this._createdAt = options.createdAt;
    this._updatedAt = options.updatedAt;
  }

  public static create(options: ViolationOptions): Violation {
    return new Violation(options);
  }

  public get id(): string {
    return this._id.value;
  }

  public get driver(): User {
    return this._driver;
  }

  public set driver(driver: User) {
    this._driver = driver;
  }

  public get vehicle(): Vehicle {
    return this._vehicle;
  }

  public set vehicle(vehicle: Vehicle) {
    this._vehicle = vehicle;
  }

  public get rule(): ViolationRule {
    return this._rule;
  }

  public set rule(rule: ViolationRule) {
    this._rule = rule;
  }

  public get description(): string {
    return this._description;
  }

  public set description(description: string) {
    this._description = description;
  }

  public get amount(): number {
    return this._amount;
  }

  public set amount(amount: number) {
    this._amount = amount;
  }

  public get isPaid(): boolean {
    return this._isPaid;
  }

  public set isPaid(isPaid: boolean) {
    this._isPaid = isPaid;
  }

  public get triggerEventId(): string {
    return this._triggerEventId;
  }

  public set triggerEventId(triggerEventId: string) {
    this._triggerEventId = triggerEventId;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public set createdAt(createdAt: Date) {
    this._createdAt = createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public set updatedAt(updatedAt: Date) {
    this._updatedAt = updatedAt;
  }

  public toJSON() {
    return {
      id: this.id,
      driver: this.driver,
      vehicle: this.vehicle,
      rule: this.rule,
      description: this.description,
      amount: this.amount,
      isPaid: this.isPaid,
      triggerEventId: this.triggerEventId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

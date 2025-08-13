import { User } from 'src/shared/entities/user.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

enum AudienceType {
  CUSTOMER = 'CUSTOMER',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
  ALL = 'ALL',
}

interface PromotionOptions {
  id?: string;
  title: string;
  audience: AudienceType;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  startDate?: Date;
  endDate?: Date;
  createdBy: User;
}

export class Promotion {
  private readonly _id: UUID;
  private _title: string;
  private _audience: AudienceType;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _startDate: Date;
  private _endDate: Date;
  private _createdBy: User;

  private constructor(options: PromotionOptions) {
    this._id = UUID.create(options.id);
    this._title = options.title;
    this._audience = options.audience;
    this._isActive = options.isActive;
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._startDate = options.startDate || new Date();
    this._endDate = options.endDate;
    this._createdBy = options.createdBy;
  }

  public static create(options: PromotionOptions): Promotion {
    return new Promotion(options);
  }

  public get id(): UUID {
    return this._id;
  }

  public get title(): string {
    return this._title;
  }

  public set title(value: string) {
    this._title = value;
  }

  public get audience(): AudienceType {
    return this._audience;
  }

  public set audience(value: AudienceType) {
    this._audience = value;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public set isActive(value: boolean) {
    this._isActive = value;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get startDate(): Date {
    return this._startDate;
  }

  public get endDate(): Date | undefined {
    return this._endDate;
  }

  public get createdBy(): User {
    return this._createdBy;
  }

  public toJSON(): PromotionOptions {
    return {
      id: this._id.value,
      title: this._title,
      audience: this._audience,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      startDate: this._startDate,
      endDate: this._endDate,
      createdBy: this._createdBy,
    };
  }
}

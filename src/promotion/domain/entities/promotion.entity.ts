import { BadRequestException } from '@nestjs/common';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';

export enum AudienceType {
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
  createdByAdmin?: Admin;
  createdBySupervisor?: Supervisor;
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
  private _createdByAdmin?: Admin;
  private _createdBySupervisor?: Supervisor;

  private constructor(options: PromotionOptions) {
    // `audience` reaches here as `any` from both use-cases, and an unrecognised value
    // survives all the way to the repository, where the lookup into AUDIENCE_TO_DB
    // yields undefined against a NOT NULL enum column. Reads are unaffected: the column
    // is a Postgres enum, so `toDomain` can only ever produce one of these four.
    if (!Object.values(AudienceType).includes(options.audience)) {
      throw new BadRequestException({
        details: [{ field: 'audience', message: 'Audience is invalid' }],
      });
    }

    this._id = UUID.create(options.id);
    this._title = options.title;
    this._audience = options.audience;
    this._isActive = options.isActive;
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._startDate = options.startDate || new Date();
    this._endDate = options.endDate;
    this._createdByAdmin = options.createdByAdmin;
    this._createdBySupervisor = options.createdBySupervisor;
  }

  public static create(options: PromotionOptions): Promotion {
    return new Promotion(options);
  }

  /**
   * A promotion whose window closes before it opens is excluded by the repository's
   * schedule predicate, so it reads as live in the admin list while being invisible to
   * every audience query.
   *
   * This is deliberately not a constructor invariant: rows written before the check
   * existed may already be inverted, and `toDomain` builds through the same path — so
   * enforcing it there would make those promotions unreadable rather than merely
   * uneditable. The use-cases call it on the way in instead.
   */
  public assertCoherentSchedule(): void {
    if (this._startDate && this._endDate && this._endDate < this._startDate) {
      throw new BadRequestException({
        details: [
          { field: 'endDate', message: 'End date must not precede start date' },
        ],
      });
    }
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

  public set startDate(newDate: Date) {
    this._startDate = newDate;
  }

  public get endDate(): Date | undefined {
    return this._endDate;
  }

  public set endDate(newDate: Date) {
    this._endDate = newDate;
  }

  public get createdByAdmin(): Admin {
    return this._createdByAdmin;
  }

  public get createdBySupervisor(): Supervisor {
    return this._createdBySupervisor;
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
      createdByAdmin: this._createdByAdmin,
      createdBySupervisor: this._createdBySupervisor,
    };
  }
}

import { UUID } from 'src/shared/value-objects/uuid.vo';

enum SupportTicketStatus {
  NEW = 'NEW',
  SEEN = 'SEEN',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
}

export class SupportTicket {
  private _id: UUID;
  private _guestId: UUID;
  private _subject: string;
  private _description: string;
  private _departmentId: UUID;
  private _status: SupportTicketStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(options: SupportTicketOptions) {
    this._id = options.id;
    this._guestId = options.guestId;
    this._subject = options.subject;
    this._description = options.description;
    this._departmentId = options.departmentId;
    this._status = options.status;
    this._createdAt = options.createdAt;
    this._updatedAt = options.updatedAt;
  }

  get id(): UUID {
    return this._id;
  }

  set id(value: UUID) {
    this._id = value;
  }

  get guestId(): UUID {
    return this._guestId;
  }

  set guestId(value: UUID) {
    this._guestId = value;
  }

  get subject(): string {
    return this._subject;
  }

  set subject(value: string) {
    this._subject = value;
  }

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    this._description = value;
  }

  get departmentId(): UUID {
    return this._departmentId;
  }

  set departmentId(value: UUID) {
    this._departmentId = value;
  }

  get status(): SupportTicketStatus {
    return this._status;
  }

  set status(value: SupportTicketStatus) {
    this._status = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  set createdAt(value: Date) {
    this._createdAt = value;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      guestId: this._guestId,
      subject: this._subject,
      description: this._description,
      departmentId: this._departmentId,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static create(options: SupportTicketOptions): SupportTicket {
    return new SupportTicket(options);
  }

  static fromPersistence(data: SupportTicketPersistence): SupportTicket {
    return SupportTicket.create({
      id: data.id,
      guestId: data.guestId,
      subject: data.subject,
      description: data.description,
      departmentId: data.departmentId,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  static toPersistence(supportTicket: SupportTicket): SupportTicketPersistence {
    return {
      id: supportTicket.id,
      guestId: supportTicket.guestId,
      subject: supportTicket.subject,
      description: supportTicket.description,
      departmentId: supportTicket.departmentId,
      status: supportTicket.status,
      createdAt: supportTicket.createdAt,
      updatedAt: supportTicket.updatedAt,
    };
  }
}

export interface SupportTicketOptions {
  id: UUID;
  guestId: UUID;
  subject: string;
  description: string;
  departmentId: UUID;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportTicketPersistence {
  id: UUID;
  guestId: UUID;
  subject: string;
  description: string;
  departmentId: UUID;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
}

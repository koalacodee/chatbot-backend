import { Department } from 'src/department/domain/entities/department.entity';
import { User } from 'src/shared/entities/user.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { TicketCode } from '../value-objects/ticket-code.vo';
import { TicketStatus } from '../value-objects/ticket-status.vo';

export interface TicketCreateRaw {
  id?: string | UUID;
  user?: User;
  guestId?: string | UUID;
  question: string;
  department: Department;
  ticketCode?: string | TicketCode;
  status?: TicketStatus | number; // Support status as TicketStatus or enum value
}

export class Ticket {
  private readonly _id: UUID;
  private _user?: User;
  private _guestId?: UUID;
  private _question: string;
  private _department: Department;
  private readonly _ticketCode: TicketCode;
  private _status: TicketStatus;

  private constructor(options: {
    id: UUID;
    user?: User;
    guestId?: UUID;
    question: string;
    department: Department;
    ticketCode?: TicketCode;
    status?: TicketStatus;
  }) {
    this._id = options.id;
    this._user = options.user;
    this._guestId = options.guestId;
    this._question = options.question;
    this._department = options.department;
    this._ticketCode = options.ticketCode ?? TicketCode.create();
    this._status = options.status ?? TicketStatus.create();
  }

  /**
   * Creates a Ticket from raw values, converting to value objects as needed.
   */
  static create(raw: TicketCreateRaw): Ticket {
    const id = raw.id instanceof UUID ? raw.id : UUID.create(raw.id);
    const guestId = raw.guestId
      ? raw.guestId instanceof UUID
        ? raw.guestId
        : UUID.create(raw.guestId)
      : undefined;
    const ticketCode =
      raw.ticketCode instanceof TicketCode
        ? raw.ticketCode
        : raw.ticketCode
          ? TicketCode.create(raw.ticketCode)
          : undefined;
    const status =
      raw.status instanceof TicketStatus
        ? raw.status
        : typeof raw.status === 'number'
          ? TicketStatus.create(raw.status)
          : undefined;

    return new Ticket({
      id,
      user: raw.user,
      guestId,
      question: raw.question,
      department: raw.department,
      ticketCode,
      status,
    });
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get user(): User | undefined {
    return this._user;
  }

  get guestId(): UUID | undefined {
    return this._guestId;
  }

  get question(): string {
    return this._question;
  }

  get department(): Department {
    return this._department;
  }

  get ticketCode(): TicketCode {
    return this._ticketCode;
  }

  get status(): TicketStatus {
    return this._status;
  }

  // Setters
  set user(user: User | undefined) {
    this._user = user;
  }

  set guestId(guestId: UUID | undefined) {
    this._guestId = guestId;
  }

  set question(question: string) {
    this._question = question;
  }

  set department(department: Department) {
    this._department = department;
  }

  set status(status: TicketStatus) {
    this._status = status;
  }

  // Enhancements: equality check
  equals(other: Ticket): boolean {
    return (
      other instanceof Ticket &&
      this._id === other._id &&
      this._ticketCode.equals(other._ticketCode)
    );
  }
}

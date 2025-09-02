import { SupportTicketAnswer } from '@prisma/client';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { TicketCode } from 'src/tickets/domain/value-objects/ticket-code.vo';
import { SupportTicketInteraction } from './support-ticket-interaction.entity';

export enum SupportTicketStatus {
  NEW = 'NEW',
  SEEN = 'SEEN',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
}

export class SupportTicket {
  private _id: UUID;
  private _guestId: UUID;
  private _guest?: Guest;
  private _subject: string;
  private _description: string;
  private _departmentId: UUID;
  private _department?: Department;
  private _answer?: SupportTicketAnswer;
  private _assignee?: Employee;
  private _status: SupportTicketStatus;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _code: TicketCode;
  private _interaction?: SupportTicketInteraction;

  private constructor(options: SupportTicketOptions) {
    this._id = UUID.create(options.id);
    this._guestId = UUID.create(options.guestId);
    this._guest = options.guest;
    this._subject = options.subject;
    this._description = options.description;
    this._departmentId = UUID.create(options.departmentId);
    this._department = options.department;
    this._answer = options.answer;
    this._assignee = options.assignee;
    this._status = options.status;
    this._createdAt = options.createdAt;
    this._updatedAt = options.updatedAt;
    this._code = options.code ?? TicketCode.create();
    this._interaction = options.interaction;
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

  get department(): Department | undefined {
    return this._department;
  }

  set department(value: Department | undefined) {
    this._department = value;
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

  get answer(): SupportTicketAnswer | undefined {
    return this._answer;
  }

  set answer(value: SupportTicketAnswer | undefined) {
    this._answer = value;
  }

  get assignee(): Employee | undefined {
    return this._assignee;
  }

  set assignee(newAssignee: Employee | undefined) {
    this._assignee = newAssignee;
  }

  get code(): string {
    return this._code.toString();
  }

  set code(value: string) {
    this._code = TicketCode.create(value);
  }

  get interaction(): SupportTicketInteraction | undefined {
    return this._interaction;
  }

  set interaction(value: SupportTicketInteraction | undefined) {
    this._interaction = value;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.toString(),
      guestId: this._guestId.toString(),
      guest: this._guest?.withoutPassword(),
      subject: this._subject,
      description: this._description,
      departmentId: this._departmentId.toString(),
      department: this._department?.toJSON(),
      answer: this._answer,
      assignee: this._assignee?.toJSON(),
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      code: this._code.toString(),
      interaction: this._interaction?.toJSON(),
    };
  }

  static create(options: SupportTicketOptions): SupportTicket {
    return new SupportTicket({ ...options, code: undefined });
  }

  static fromPersistence(data: SupportTicketPersistence): SupportTicket {
    return new SupportTicket({
      id: data.id,
      guestId: data.guestId,
      subject: data.subject,
      guest: data.guest,
      description: data.description,
      departmentId: data.departmentId,
      department: data.department,
      answer: data.answer,
      assignee: data.assignee,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      code: TicketCode.create(data.code),
      interaction: data.interaction,
    });
  }

  static toPersistence(supportTicket: SupportTicket): SupportTicketPersistence {
    return {
      id: supportTicket.id.toString(),
      guestId: supportTicket.guestId.toString(),
      subject: supportTicket.subject,
      guest: supportTicket._guest,
      description: supportTicket.description,
      departmentId: supportTicket.departmentId.toString(),
      department: supportTicket._department,
      answer: supportTicket._answer,
      assignee: supportTicket._assignee,
      status: supportTicket.status,
      createdAt: supportTicket.createdAt,
      updatedAt: supportTicket.updatedAt,
      code: supportTicket._code.toString(),
      interaction: supportTicket.interaction,
    };
  }
}

export interface SupportTicketOptions {
  id?: string;
  guestId: string;
  guest?: Guest;
  subject: string;
  description: string;
  departmentId: string;
  department?: Department;
  answer?: SupportTicketAnswer;
  assignee?: Employee;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
  code?: TicketCode;
  interaction?: SupportTicketInteraction;
}

export interface SupportTicketPersistence {
  id: string;
  guestId: string;
  guest?: Guest;
  subject: string;
  description: string;
  departmentId: string;
  department?: Department;
  answer?: SupportTicketAnswer;
  assignee?: Employee;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
  code: string;
  interaction?: SupportTicketInteraction;
}

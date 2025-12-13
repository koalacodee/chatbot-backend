import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { TicketCode } from 'src/tickets/domain/value-objects/ticket-code.vo';
import { SupportTicketInteraction } from './support-ticket-interaction.entity';
import { SupportTicketAnswer } from './support-ticket-answer.entity';

export enum SupportTicketStatus {
  NEW = 'NEW',
  SEEN = 'SEEN',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
}

export class SupportTicket {
  private _id: UUID;
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
  private _guestName?: string;
  private _guestPhone?: string;
  private _guestEmail?: string;

  private constructor(options: SupportTicketOptions) {
    this._id = UUID.create(options.id);
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
    this._guestName = options.guestName;
    this._guestPhone = options.guestPhone;
    this._guestEmail = options.guestEmail;
  }

  get id(): UUID {
    return this._id;
  }
  set id(value: UUID) {
    this._id = value;
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

  get guestName(): string | undefined {
    return this._guestName;
  }
  set guestName(value: string | undefined) {
    this._guestName = value;
  }

  get guestPhone(): string | undefined {
    return this._guestPhone;
  }
  set guestPhone(value: string | undefined) {
    this._guestPhone = value;
  }

  get guestEmail(): string | undefined {
    return this._guestEmail;
  }
  set guestEmail(value: string | undefined) {
    this._guestEmail = value;
  }

  toJSON() {
    return {
      id: this._id.toString(),
      subject: this._subject,
      description: this._description,
      departmentId: this._departmentId.toString(),
      department: this._department?.toJSON?.(),
      answer: this._answer,
      assignee: this._assignee?.toJSON?.(),
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      code: this._code.toString(),
      interaction: this._interaction?.toJSON?.(),
      guestName: this._guestName,
      guestPhone: this._guestPhone,
      guestEmail: this._guestEmail,
    };
  }

  static create(options: SupportTicketOptions): SupportTicket {
    return new SupportTicket({ ...options, code: undefined });
  }

  static fromPersistence(data: SupportTicketPersistence): SupportTicket {
    return new SupportTicket({
      id: data.id,
      subject: data.subject,
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
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail,
    });
  }

  static toPersistence(supportTicket: SupportTicket): SupportTicketPersistence {
    return {
      id: supportTicket.id.toString(),
      subject: supportTicket.subject,
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
      guestName: supportTicket._guestName,
      guestPhone: supportTicket._guestPhone,
      guestEmail: supportTicket._guestEmail,
    };
  }
}

export interface SupportTicketOptions {
  id?: string;
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
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
}

export interface SupportTicketPersistence {
  id: string;
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
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
}

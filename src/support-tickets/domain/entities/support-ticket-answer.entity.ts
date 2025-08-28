import { UUID } from 'src/shared/value-objects/uuid.vo';
import { SupportTicket } from './support-ticket.entity';
import { Attachment } from 'src/files/domain/entities/attachment.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';

enum Rating {
  SATISFACTION = 'SATISFACTION',
  DISSATISFACTION = 'DISSATISFACTION',
}

export interface SupportTicketAnswerOptions {
  id?: string;
  supportTicket: SupportTicket;
  content: string;
  attachment?: Attachment;
  answerer: Employee | Supervisor | Admin;
  createdAt?: Date;
  updatedAt?: Date;
  rating?: Rating;
}

export class SupportTicketAnswer {
  private readonly _id: UUID;
  private _supportTicket: SupportTicket;
  private _content: string;
  private _attachment?: Attachment;
  private _answerer: Employee | Supervisor | Admin;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _rating: Rating;

  private constructor(options: SupportTicketAnswerOptions) {
    this._id = UUID.create(options.id);
    this._supportTicket = options.supportTicket;
    this._content = options.content;
    this._attachment = options.attachment;
    this._answerer = options.answerer;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._rating = options.rating;
  }

  static create(options: SupportTicketAnswerOptions): SupportTicketAnswer {
    return new SupportTicketAnswer(options);
  }

  get id(): UUID {
    return this._id;
  }

  get supportTicket(): SupportTicket {
    return this._supportTicket;
  }

  set supportTicket(supportTicket: SupportTicket) {
    this._supportTicket = supportTicket;
  }

  get content(): string {
    return this._content;
  }

  set content(content: string) {
    this._content = content;
  }

  get answerer(): Employee | Supervisor | Admin {
    return this._answerer;
  }

  set answerer(answerer: Employee | Supervisor | Admin) {
    this._answerer = answerer;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  set createdAt(createdAt: Date) {
    this._createdAt = createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set updatedAt(updatedAt: Date) {
    this._updatedAt = updatedAt;
  }

  get rating(): Rating {
    return this._rating;
  }

  set rating(rating: Rating) {
    this._rating = rating;
  }

  get attachment(): Attachment | undefined {
    return this._attachment;
  }

  set attachment(attachment: Attachment | undefined) {
    this._attachment = attachment;
  }

  hasRating(): boolean {
    return !!this._rating;
  }

  toJSON(): unknown {
    return {
      id: this.id,
      supportTicketId: this.supportTicket.id,
      content: this.content,
      attachment: this.attachment?.toJSON(),
      answerer: this.answerer,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      rating: this._rating,
    };
  }
}

import { UUID } from 'src/shared/value-objects/uuid.vo';
import { SupportTicket } from './support-ticket.entity';
import { User } from 'src/shared/entities/user.entity';
import { Attachment } from 'src/shared/entities/attachment.entity';

enum Rating {
  SATISFIED = 'SATISFIED',
  NEUTRAL = 'NEUTRAL',
  DISSATISFIED = 'DISSATISFIED',
}

export interface SupportTicketAnswerOptions {
  id?: string;
  supportTicket: SupportTicket;
  content: string;
  attachment?: Attachment;
  answerer: User;
  assigned: User;
  createdAt?: Date;
  updatedAt?: Date;
  rating?: Rating;
}

export class SupportTicketAnswer {
  private readonly _id: UUID;
  private _supportTicket: SupportTicket;
  private _content: string;
  private _attachment?: Attachment;
  private _answerer: User;
  private _assigned: User;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _rating: Rating;

  private constructor(options: SupportTicketAnswerOptions) {
    this._id = UUID.create(options.id);
    this._supportTicket = options.supportTicket;
    this._content = options.content;
    this._attachment = options.attachment;
    this._answerer = options.answerer;
    this._assigned = options.assigned;
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

  get answerer(): User {
    return this._answerer;
  }

  set answerer(answerer: User) {
    this._answerer = answerer;
  }

  get assigned(): User {
    return this._assigned;
  }

  set assigned(assigned: User) {
    this._assigned = assigned;
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
      answerer: this.answerer.toJSON(),
      assigned: this.assigned.toJSON(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      rating: this._rating,
    };
  }
}

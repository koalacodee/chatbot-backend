import { Conversation } from '@prisma/client';
import { RefreshToken } from 'src/auth/domain/entities/refresh-token.entity';
import { Interaction } from 'src/shared/entities/interactions.entity';
import { Email } from 'src/shared/value-objects/email.vo';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { SupportTicket } from 'src/support-tickets/domain/entities/support-ticket.entity';

interface GuestOptions {
  id?: string;
  name: string;
  email: Email;
  phone: string;
  createdAt?: Date;
  updatedAt?: Date;
  tokens?: RefreshToken[];
  conversations?: Conversation[];
  interactions?: Interaction[];
  supportTickets?: SupportTicket[];
}

export class Guest {
  private readonly _id: UUID;
  private _name: string;
  private _email: Email;
  private _phone: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _tokens: RefreshToken[];
  private _conversations: Conversation[];
  private _interactions: Interaction[];
  private _supportTickets: SupportTicket[];

  private constructor(options: GuestOptions) {
    this._id = options.id ? UUID.create(options.id) : UUID.create();
    this._name = options.name;
    this._email = options.email;
    this._phone = options.phone;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._tokens = options.tokens;
    this._conversations = options.conversations;
    this._interactions = options.interactions;
    this._supportTickets = options.supportTickets;
  }

  static create(options: GuestOptions) {
    return new Guest(options);
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get email() {
    return this._email;
  }

  set email(value: Email) {
    this._email = value;
  }

  get phone() {
    return this._phone;
  }

  set phone(value: string) {
    this._phone = value;
  }

  get createdAt() {
    return this._createdAt;
  }

  set createdAt(value: Date) {
    this._createdAt = value;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  get tokens() {
    return this._tokens;
  }

  set tokens(value: RefreshToken[]) {
    this._tokens = value;
  }

  get conversations() {
    return this._conversations;
  }

  set conversations(value: Conversation[]) {
    this._conversations = value;
  }

  get interactions() {
    return this._interactions;
  }

  set interactions(value: Interaction[]) {
    this._interactions = value;
  }

  get supportTickets() {
    return this._supportTickets;
  }

  set supportTickets(value: SupportTicket[]) {
    this._supportTickets = value;
  }
}

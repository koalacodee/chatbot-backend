import { UUID } from 'src/shared/value-objects/uuid.vo';
import { SupportTicket } from './support-ticket.entity';
import { Guest } from 'src/guest/domain/entities/guest.entity';

export enum InteractionType {
  SATISFACTION = 'SATISFACTION',
  DISSATISFACTION = 'DISSATISFACTION',
}

export interface SupportTicketInteractionOptions {
  id: string;
  supportTicketId?: string;
  guestId?: string;
  type: InteractionType;
  supportTicket?: SupportTicket;
  guest?: Guest;
}

export class SupportTicketInteraction {
  private readonly _id: UUID;
  private _supportTicketId?: UUID;
  private _supportTicket?: SupportTicket;
  private _guestId?: UUID;
  private _guest?: Guest;
  private _type: InteractionType;

  private constructor(options: SupportTicketInteractionOptions) {
    this._id = UUID.create(options.id);
    this._supportTicketId = options.supportTicketId
      ? UUID.create(options.supportTicketId)
      : undefined;
    this._guestId = options.guestId ? UUID.create(options.guestId) : undefined;
    this._type = options.type;
    this._supportTicket = options.supportTicket;
    this._guest = options.guest;
  }

  static create(options: SupportTicketInteractionOptions) {
    return new SupportTicketInteraction(options);
  }

  get id(): UUID {
    return this._id;
  }

  get supportTicketId(): UUID | undefined {
    return this._supportTicketId;
  }

  set supportTicketId(supportTicketId: UUID | undefined) {
    this._supportTicketId = supportTicketId;
  }

  get guestId(): UUID | undefined {
    return this._guestId;
  }

  set guestId(guestId: UUID | undefined) {
    this._guestId = guestId;
  }

  get supportTicket(): SupportTicket | undefined {
    return this._supportTicket;
  }

  set supportTicket(supportTicket: SupportTicket | undefined) {
    this._supportTicket = supportTicket;
  }

  get guest(): Guest | undefined {
    return this._guest;
  }

  set guest(guest: Guest | undefined) {
    this._guest = guest;
  }

  get type(): InteractionType {
    return this._type;
  }

  set type(type: InteractionType) {
    this._type = type;
  }

  toJSON(): SupportTicketInteractionOptions {
    return {
      id: this._id.value,
      supportTicketId: this._supportTicketId?.value,
      guestId: this._guestId?.value,
      type: this._type,
      supportTicket: this._supportTicket,
      guest: this._guest,
    };
  }
}

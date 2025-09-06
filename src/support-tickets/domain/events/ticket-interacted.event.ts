import { InteractionType } from '../entities/support-ticket-interaction.entity';

export class TicketInteractedEvent {
  public constructor(
    public readonly id: string,
    public readonly rating?: InteractionType,
  ) {}
}

import { InteractionType } from '../entities/support-ticket-interaction.entity';

export class TicketAnsweredEvent {
  public constructor(
    public readonly title: string,
    public readonly id: string,
    public readonly answeredById: string,
    public readonly answeredAt: Date,
    public readonly rating?: InteractionType,
  ) {}
}

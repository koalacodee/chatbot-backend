import { InteractionType } from '../entities/support-ticket-interaction.entity';

export class TicketAnsweredEvent {
  public constructor(
    public readonly title: string,
    public readonly id: string,
    public readonly answeredById: string,
    public readonly answeredAt: Date,
    public readonly code: string,
    public readonly rating?: InteractionType,
    public readonly repliedInSeconds?: number,
  ) {}
}

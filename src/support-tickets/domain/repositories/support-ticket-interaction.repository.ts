import { SupportTicketInteraction } from '../entities/support-ticket-interaction.entity';

export abstract class SupportTicketInteractionRepository {
  abstract findById(id: string): Promise<SupportTicketInteraction | null>;
  abstract findBySupportTicketId(
    supportTicketId: string,
  ): Promise<SupportTicketInteraction | null>;
  abstract findByGuestId(guestId: string): Promise<SupportTicketInteraction[]>;
  abstract save(interaction: SupportTicketInteraction): Promise<void>;
  abstract update(interaction: SupportTicketInteraction): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract findAll(): Promise<SupportTicketInteraction[]>;
}

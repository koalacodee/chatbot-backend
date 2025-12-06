import { Injectable } from '@nestjs/common';
import { SupportTicketInteractionRepository } from '../../../domain/repositories/support-ticket-interaction.repository';
import { SupportTicketInteraction } from '../../../domain/entities/support-ticket-interaction.entity';
import { InteractionType } from '../../../domain/entities/support-ticket-interaction.entity';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { supportTicketInteractions } from 'src/common/drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class DrizzleSupportTicketInteractionRepository extends SupportTicketInteractionRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  async findById(id: string): Promise<SupportTicketInteraction | null> {
    const [interaction] = await this.db
      .select()
      .from(supportTicketInteractions)
      .where(eq(supportTicketInteractions.id, id))
      .limit(1);

    if (!interaction) return null;

    return SupportTicketInteraction.create({
      id: interaction.id,
      supportTicketId: interaction.supportTicketId,
      guestId: interaction.guestId || undefined,
      type: interaction.type as InteractionType,
    });
  }

  async findBySupportTicketId(
    supportTicketId: string,
  ): Promise<SupportTicketInteraction | null> {
    const [interaction] = await this.db
      .select()
      .from(supportTicketInteractions)
      .where(eq(supportTicketInteractions.supportTicketId, supportTicketId))
      .limit(1);

    if (!interaction) return null;

    return SupportTicketInteraction.create({
      id: interaction.id,
      supportTicketId: interaction.supportTicketId,
      guestId: interaction.guestId || undefined,
      type: interaction.type as InteractionType,
    });
  }

  async findByGuestId(guestId: string): Promise<SupportTicketInteraction[]> {
    const interactions = await this.db
      .select()
      .from(supportTicketInteractions)
      .where(eq(supportTicketInteractions.guestId, guestId));

    return interactions.map((interaction) =>
      SupportTicketInteraction.create({
        id: interaction.id,
        supportTicketId: interaction.supportTicketId,
        guestId: interaction.guestId || undefined,
        type: interaction.type as InteractionType,
      }),
    );
  }

  async save(interaction: SupportTicketInteraction): Promise<void> {
    const data = {
      id: interaction.id.toString(),
      supportTicketId: interaction.supportTicketId?.toString(),
      guestId: interaction.guestId?.toString(),
      type: interaction.type.toLowerCase() as
        | 'satisfaction'
        | 'dissatisfaction',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.insert(supportTicketInteractions).values(data);
  }

  async update(interaction: SupportTicketInteraction): Promise<void> {
    const data = {
      supportTicketId: interaction.supportTicketId?.toString(),
      guestId: interaction.guestId?.toString(),
      type: interaction.type.toLowerCase() as
        | 'satisfaction'
        | 'dissatisfaction',
      updatedAt: new Date().toISOString(),
    };

    await this.db
      .update(supportTicketInteractions)
      .set(data)
      .where(eq(supportTicketInteractions.id, interaction.id.toString()));
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(supportTicketInteractions)
      .where(eq(supportTicketInteractions.id, id));
  }

  async findAll(): Promise<SupportTicketInteraction[]> {
    const interactions = await this.db.select().from(supportTicketInteractions);

    return interactions.map((interaction) =>
      SupportTicketInteraction.create({
        id: interaction.id,
        supportTicketId: interaction.supportTicketId,
        guestId: interaction.guestId || undefined,
        type: interaction.type as InteractionType,
      }),
    );
  }
}

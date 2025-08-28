import { Injectable } from '@nestjs/common';
import { SupportTicketInteractionRepository } from '../../domain/repositories/support-ticket-interaction.repository';
import { SupportTicketInteraction } from '../../domain/entities/support-ticket-interaction.entity';
import { InteractionType } from '../../domain/entities/support-ticket-interaction.entity';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PrismaSupportTicketInteractionRepository extends SupportTicketInteractionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<SupportTicketInteraction | null> {
    const interaction = await this.prisma.supportTicketInteraction.findUnique({
      where: { id },
    });

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
    const interaction = await this.prisma.supportTicketInteraction.findUnique({
      where: { supportTicketId },
    });

    if (!interaction) return null;

    return SupportTicketInteraction.create({
      id: interaction.id,
      supportTicketId: interaction.supportTicketId,
      guestId: interaction.guestId || undefined,
      type: interaction.type as InteractionType,
    });
  }

  async findByGuestId(guestId: string): Promise<SupportTicketInteraction[]> {
    const interactions = await this.prisma.supportTicketInteraction.findMany({
      where: { guestId },
    });

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
      type: interaction.type,
    };

    await this.prisma.supportTicketInteraction.create({
      data,
    });
  }

  async update(interaction: SupportTicketInteraction): Promise<void> {
    const data = {
      supportTicketId: interaction.supportTicketId?.toString(),
      guestId: interaction.guestId?.toString(),
      type: interaction.type,
    };

    await this.prisma.supportTicketInteraction.update({
      where: { id: interaction.id.toString() },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.supportTicketInteraction.delete({
      where: { id },
    });
  }

  async findAll(): Promise<SupportTicketInteraction[]> {
    const interactions = await this.prisma.supportTicketInteraction.findMany(
      {},
    );

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

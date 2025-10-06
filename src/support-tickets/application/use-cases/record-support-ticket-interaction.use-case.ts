import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupportTicketInteractionRepository } from '../../domain/repositories/support-ticket-interaction.repository';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import {
  SupportTicketInteraction,
  InteractionType,
} from '../../domain/entities/support-ticket-interaction.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketInteractedEvent } from 'src/support-tickets/domain/events/ticket-interacted.event';

export interface RecordSupportTicketInteractionInput {
  guestId: string;
  supportTicketId: string;
  type: InteractionType;
}

export interface RecordSupportTicketInteractionOutput {
  interaction: {
    id: string;
    supportTicketId: string;
    guestId: string;
    type: InteractionType;
    createdAt: Date;
    updatedAt: Date;
  };
}

@Injectable()
export class RecordSupportTicketInteractionUseCase {
  constructor(
    private readonly interactionRepository: SupportTicketInteractionRepository,
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    input: RecordSupportTicketInteractionInput,
  ): Promise<RecordSupportTicketInteractionOutput> {
    // Validate that the support ticket exists
    const supportTicket = await this.supportTicketRepository.findById(
      input.supportTicketId,
    );
    if (!supportTicket) {
      throw new NotFoundException({
        details: [
          { field: 'supportTicketId', message: 'Support ticket not found' },
        ],
      });
    }

    // // Validate guest ownership - ensure the guest owns this support ticket
    // if (supportTicket.guestId.toString() !== input.guestId) {
    //   throw new ForbiddenException('Guest does not own this support ticket');
    // }

    // Check if an interaction already exists for this support ticket
    const existingInteraction =
      await this.interactionRepository.findBySupportTicketId(
        input.supportTicketId,
      );
    if (existingInteraction) {
      return null;
    }

    // Create new interaction
    const interaction = SupportTicketInteraction.create({
      id: UUID.create().toString(),
      supportTicketId: input.supportTicketId,
      anonymousId: input.guestId,
      type: input.type,
    });

    await this.interactionRepository.save(interaction).then(() => {
      this.eventEmitter.emit(
        TicketInteractedEvent.name,
        new TicketInteractedEvent(supportTicket.id.toString(), input.type),
      );
    });

    return {
      interaction: {
        id: interaction.id.toString(),
        supportTicketId: interaction.supportTicketId!.toString(),
        guestId: interaction.anonymousId!.toString(),
        type: interaction.type,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }
}

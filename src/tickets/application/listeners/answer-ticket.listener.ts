import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { KnowledgeChunkRepository } from 'src/knowledge-chunks/domain/repositories/knowledge-chunk.repository';
import { TicketRepository } from 'src/tickets/domain/repositories/ticket.repository';
import { PointRepository } from 'src/shared/repositories/point.repository';
import { ConfigService } from '@nestjs/config';
import { PushNotificationService } from 'src/common/push-manager';
import { KNOWLEDGE_CHUNK_EVENTS } from 'src/knowledge-chunks/domain/events/knowledge-chunk.events';
import { TICKET_EVENTS } from 'src/tickets/domain/events/ticket.events';
import { TicketStatusEnum } from 'src/tickets/domain/value-objects/ticket-status.vo';

@Injectable()
export class AnswerTicketListener {
  private readonly logger = new Logger(AnswerTicketListener.name);

  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly knowledgeChunkRepo: KnowledgeChunkRepository,
    private readonly pointRepo: PointRepository,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly pushNotification: PushNotificationService,
  ) {}

  @OnEvent(KNOWLEDGE_CHUNK_EVENTS.CREATED)
  async uponKnowledgeChunkCreation({ knowledgeChunkId }) {
    this.logger.log(`Processing new knowledge chunk: ${knowledgeChunkId}`);

    const knowledgeChunk =
      await this.knowledgeChunkRepo.findById(knowledgeChunkId);
    if (!knowledgeChunk?.pointId) {
      this.logger.warn('Knowledge chunk not found or has no pointId');
      return;
    }

    const point = await this.pointRepo.findById(knowledgeChunk.pointId);
    if (!point?.vector) {
      this.logger.warn(
        `Point not found or has no vector for pointId: ${knowledgeChunk.pointId}`,
      );
      return;
    }

    this.logger.log('Fetching pending tickets');
    const pendingTickets = await this.ticketRepo.findPendingTickets();
    const similarityThreshold = +this.config.getOrThrow(
      'SIMILARITY_SEARCH_THRESHOLD',
    );

    this.logger.log(
      `Searching similar points with threshold: ${similarityThreshold}`,
    );
    const pointIds = pendingTickets.map(({ pointId }) => pointId);
    const similarPoints = await this.pointRepo.search(
      point.vector,
      1000,
      similarityThreshold,
      'tickets',
      pointIds,
    );

    if (similarPoints.length === 0) {
      this.logger.log('No similar points found');
      return;
    }

    this.logger.log(`Found ${similarPoints.length} similar points`);
    const similarPointIds = new Set(
      similarPoints.map(({ id }) => id.toString()),
    );
    const answeredTickets = pendingTickets.filter(({ pointId }) =>
      similarPointIds.has(pointId),
    );

    answeredTickets.forEach(
      (ticket) => (ticket.status = TicketStatusEnum.CLOSED),
    );
    if (answeredTickets.length === 0) {
      this.logger.log('No tickets to answer');
      return;
    }

    this.logger.log(
      `Processing ${answeredTickets.length} tickets for answering`,
    );
    const answeredIds = answeredTickets.map((t) => t.id.value);
    this.eventEmitter.emit(TICKET_EVENTS.ANSWERED, { ticketIds: answeredIds });

    const guestIds: string[] = [];
    for (const ticket of answeredTickets) {
      guestIds.push(ticket.guest.id.value);
    }

    this.logger.log(`Sending notifications to ${guestIds.length} guests`);
    await Promise.all([
      this.pushNotification.sendToGuests(guestIds, {
        title: 'Ticket Answered',
        body: 'Your ticket has been answered by a knowledge chunk.',
      }),
      this.ticketRepo.saveMany(answeredTickets),
    ]);

    this.logger.log('Successfully processed and answered tickets');
  }
}

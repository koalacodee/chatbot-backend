import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { ClassifierService } from 'src/tickets/domain/classifier/classifier-service.interface';
import { Ticket } from 'src/tickets/domain/entities/ticket.entity';
import { TicketRepository } from 'src/tickets/domain/repositories/ticket.repository';
import { PointRepository } from 'src/shared/repositories/point.repository';
import { EmbeddingService } from 'src/shared/embedding/embedding-service.interface';
import { Vector } from 'src/shared/value-objects/vector.vo';
import { Point } from 'src/shared/entities/point.entity';

@Injectable()
export class CreateTicketListener {
  private readonly threshold = parseInt(
    this.config.getOrThrow('CLASSIFYING_THRESHOLD'),
  );
  private readonly logger = new Logger(CreateTicketListener.name);

  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly classifier: ClassifierService,
    private readonly config: ConfigService,
    private readonly ticketRepo: TicketRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly userRepo: UserRepository,
    private readonly pointRepo: PointRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @OnEvent('chatbot.unanswered')
  async handleUnanswered({
    question,
    userId,
    guestId,
    ticketCode,
  }: {
    question: string;
    userId?: string;
    guestId?: string;
    ticketCode?: number;
  }) {
    if (!guestId && !userId) {
      this.logger.warn(`User Or Guest Unprovided`);
      return;
    }

    const departments = await this.departmentRepo.findAll();

    if (departments.length === 0) {
      this.logger.warn('No Departments to Classify');
      return;
    }

    const topClassified = await this.getTopClassified(
      question,
      departments.map((d) => d.name),
    );

    if (topClassified.score < this.threshold) {
      this.eventEmitter.emit('tickets.outOfScope', {
        question,
        score: topClassified.score,
        guestId,
        userId,
      });

      this.logger.warn(`Question out of scope. Score: ${topClassified.score}`);
      return;
    }
    const matchedDepartment = departments.find(
      (d) => d.name === topClassified.label,
    );

    if (!matchedDepartment) {
      this.logger.error(
        `Classified label "${topClassified.label}" not found among departments`,
      );
      return;
    }

    const user = userId ? await this.userRepo.findById(userId) : undefined;
    const isGuest = !userId && guestId;

    try {
      // Create vector embedding for the question
      const embedding = await this.embeddingService.embed(question);
      const vector = Vector.create({
        vector: embedding,
        dim: embedding.length as 2048,
      });

      // Create the point first
      const point = Point.create({
        vector,
      });
      const savedPoint = await this.pointRepo.save(point, 'tickets');

      // Create the ticket with the associated point
      const newTicket = Ticket.create({
        department: matchedDepartment,
        question,
        guestId: isGuest ? guestId : undefined,
        user: user,
        ticketCode: `${ticketCode}`,
        pointId: savedPoint.id.value,
      });

      await this.ticketRepo.save(newTicket);

      this.eventEmitter.emit('tickets.created', {
        department: newTicket.department.id.toString(),
        ticket: newTicket.id.toString(),
        pointId: savedPoint.id.value,
      });
    } catch (error) {
      this.logger.error(`Failed to create ticket with point: ${error.message}`);

      // Fallback: create ticket without point if embedding fails
      const newTicket = Ticket.create({
        department: matchedDepartment,
        question,
        guestId: isGuest ? guestId : undefined,
        user: user,
        ticketCode: `${ticketCode}`,
      });

      await this.ticketRepo.save(newTicket);

      this.eventEmitter.emit('tickets.created', {
        department: newTicket.department.id.toString(),
        ticket: newTicket.id.toString(),
      });
    }
  }

  private async getTopClassified(question: string, labels: string[]) {
    const classified = await this.classifier.classify(question, labels);

    return classified[0];
  }
}

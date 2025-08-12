import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SupportTicketAnswerRepository } from '../../domain/repositories/support-ticket-answer.repository';
import { SupportTicketAnswer } from '../../domain/entities/support-ticket-answer.entity';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { User } from 'src/shared/entities/user.entity';

@Injectable()
export class PrismaSupportTicketAnswerRepository extends SupportTicketAnswerRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<SupportTicketAnswer> {
    const ticket = SupportTicket.fromPersistence({
      id: UUID.create(row.supportTicket.id),
      guestId: UUID.create(row.supportTicket.guestId),
      subject: row.supportTicket.subject,
      description: row.supportTicket.description,
      departmentId: UUID.create(row.supportTicket.departmentId),
      status: row.supportTicket.status,
      createdAt: row.supportTicket.createdAt,
      updatedAt: row.supportTicket.updatedAt,
    });

    return SupportTicketAnswer.create({
      id: row.id,
      supportTicket: ticket,
      content: row.content,
      // attachment intentionally not eagerly loaded; use AttachmentRepository by targetId when needed
      answerer: row.answerer
        ? await User.create(row.answerer, false)
        : undefined,
      assigned: row.assigned
        ? await User.create(row.assigned, false)
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      rating: row.rating,
    });
  }

  async save(answer: SupportTicketAnswer): Promise<SupportTicketAnswer> {
    const data = {
      id: answer.id.toString(),
      supportTicketId: answer.supportTicket.id.toString(),
      content: answer.content,
      answererId: answer.answerer.id.toString(),
      assignedId: answer.assigned.id.toString(),
      createdAt: answer.createdAt,
      updatedAt: new Date(),
      rating: answer.rating,
    } as const;

    const upserted = await this.prisma.supportTicketAnswer.upsert({
      where: { id: data.id },
      update: {
        content: data.content,
        answererId: data.answererId,
        assignedId: data.assignedId,
        updatedAt: data.updatedAt,
        rating: data.rating,
      },
      create: data,
      include: {
        supportTicket: true,
        answerer: true,
        assigned: true,
      },
    });

    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<SupportTicketAnswer | null> {
    const row = await this.prisma.supportTicketAnswer.findUnique({
      where: { id },
      include: { supportTicket: true, answerer: true, assigned: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findBySupportTicketId(
    supportTicketId: string,
  ): Promise<SupportTicketAnswer[]> {
    const rows = await this.prisma.supportTicketAnswer.findMany({
      where: { supportTicketId },
      include: { supportTicket: true, answerer: true, assigned: true },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<SupportTicketAnswer | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.supportTicketAnswer.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.supportTicketAnswer.count({
      where: { id },
    });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.supportTicketAnswer.count();
  }
}

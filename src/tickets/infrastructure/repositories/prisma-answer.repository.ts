import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Answer } from 'src/tickets/domain/entities/answer.entity';
import { AnswerRepository } from 'src/tickets/domain/repositories/answer.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Injectable()
export class PrismaAnswerRepository extends AnswerRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(answer: Answer): Promise<Answer> {
    const data = answer.toPersistence();

    const savedAnswer = await this.prisma.ticketAnswer.upsert({
      where: { id: data.id },
      update: {
        content: data.content,
        updatedAt: new Date(),
      },
      create: {
        id: data.id,
        ticketId: data.ticketId,
        content: data.content,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });

    return Answer.fromPersistence({
      id: savedAnswer.id,
      ticketId: savedAnswer.ticketId,
      content: savedAnswer.content,
      createdAt: savedAnswer.createdAt,
      updatedAt: savedAnswer.updatedAt,
    });
  }

  async findById(id: UUID): Promise<Answer | null> {
    const answer = await this.prisma.ticketAnswer.findUnique({
      where: { id: id.toString() },
    });

    if (!answer) {
      return null;
    }

    return Answer.fromPersistence({
      id: answer.id,
      ticketId: answer.ticketId,
      content: answer.content,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
    });
  }

  async findByTicketId(ticketId: UUID): Promise<Answer | null> {
    const answer = await this.prisma.ticketAnswer.findUnique({
      where: { ticketId: ticketId.toString() },
    });

    if (!answer) {
      return null;
    }

    return Answer.fromPersistence({
      id: answer.id,
      ticketId: answer.ticketId,
      content: answer.content,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
    });
  }

  async findAll(): Promise<Answer[]> {
    const answers = await this.prisma.ticketAnswer.findMany();

    return answers.map((answer) =>
      Answer.fromPersistence({
        id: answer.id,
        ticketId: answer.ticketId,
        content: answer.content,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
      }),
    );
  }

  async delete(id: UUID): Promise<void> {
    await this.prisma.ticketAnswer.delete({
      where: { id: id.toString() },
    });
  }
}

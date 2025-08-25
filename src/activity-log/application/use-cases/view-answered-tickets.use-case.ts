import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface ViewAnsweredTicketsInputDto {
  userId?: string;
}

export interface AnsweredTicketRowDto {
  ticketId: string;
  subject: string;
  customerRating: 'SATISFIED' | 'NEUTRAL' | 'DISSATISFIED' | null;
  responseTimeMs: number | null;
  dateAnswered: Date;
  user?: { id: string; name: string };
}

@Injectable()
export class ViewAnsweredTicketsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ViewAnsweredTicketsInputDto,
  ): Promise<AnsweredTicketRowDto[]> {
    const where = {
      OR: [
        {
          answererAdminId: input.userId ? { equals: input.userId } : undefined,
        },
        {
          answererSupervisorId: input.userId
            ? { equals: input.userId }
            : undefined,
        },
        {
          answererEmployeeId: input.userId
            ? { equals: input.userId }
            : undefined,
        },
      ],
    };
    const rows = await this.prisma.supportTicketAnswer.findMany({
      where,
      include: {
        supportTicket: { select: { id: true, subject: true, createdAt: true } },
        answererAdmin: {
          select: { id: true, user: { select: { name: true } } },
        },
        answererSupervisor: {
          select: { id: true, user: { select: { name: true } } },
        },
        answererEmployee: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((a) => ({
      ticketId: a.supportTicket.id,
      subject: a.supportTicket.subject,
      customerRating: a.rating ?? null,
      responseTimeMs: a.supportTicket.createdAt
        ? a.createdAt.getTime() - a.supportTicket.createdAt.getTime()
        : null,
      dateAnswered: a.createdAt,
      user: input.userId
        ? undefined
        : a.answererAdmin
          ? { id: a.answererAdmin.id, name: a.answererAdmin.user.name }
          : a.answererEmployee
            ? { id: a.answererEmployee.id, name: a.answererEmployee.user.name }
            : a.answererSupervisor
              ? {
                  id: a.answererSupervisor.id,
                  name: a.answererSupervisor.user.name,
                }
              : undefined,
    }));
  }
}

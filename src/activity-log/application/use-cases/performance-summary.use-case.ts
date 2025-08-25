import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface PerformanceSummaryInputDto {
  userId?: string;
}

export interface PerformanceSummaryOutputDto {
  ticketsAnswered: number;
  avgResponseTime: number | null; // milliseconds
  tasksPerformed: number;
  avgTaskTime: number | null; // milliseconds
  tasksApproved: number;
  satisfiedTickets: number;
  dissatisfiedTickets: number;
}

@Injectable()
export class PerformanceSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: PerformanceSummaryInputDto,
  ): Promise<PerformanceSummaryOutputDto> {
    const userFilter = input.userId ? { equals: input.userId } : undefined;

    // Tickets answered and ratings
    const answers = await this.prisma.supportTicketAnswer.findMany({
      where: {
        OR: [
          { answererAdminId: userFilter },
          { answererSupervisorId: userFilter },
          { answererEmployeeId: userFilter },
        ],
      },
      select: {
        createdAt: true,
        rating: true,
        supportTicket: { select: { createdAt: true } },
      },
    });
    const ticketsAnswered = answers.length;
    const responseDurations = answers
      .map((a) =>
        a.supportTicket?.createdAt
          ? a.createdAt.getTime() - a.supportTicket.createdAt.getTime()
          : null,
      )
      .filter((v): v is number => typeof v === 'number' && isFinite(v));
    const avgResponseTime = responseDurations.length
      ? Math.round(
          responseDurations.reduce((s, v) => s + v, 0) /
            responseDurations.length,
        )
      : null;
    const satisfiedTickets = answers.filter(
      (a) => a.rating === 'SATISFIED',
    ).length;
    const dissatisfiedTickets = answers.filter(
      (a) => a.rating === 'DISSATISFIED',
    ).length;

    // Tasks performed and average task time
    const tasks = await this.prisma.task.findMany({
      where: {
        OR: [
          { performerAdminId: userFilter },
          { performerSupervisorId: userFilter },
          { performerEmployeeId: userFilter },
        ],
      },
      select: { createdAt: true, completedAt: true },
    });
    const tasksPerformed = tasks.length;
    const taskDurations = tasks
      .map((t) =>
        t.completedAt ? t.completedAt.getTime() - t.createdAt.getTime() : null,
      )
      .filter((v): v is number => typeof v === 'number' && isFinite(v));
    const avgTaskTime = taskDurations.length
      ? Math.round(
          taskDurations.reduce((s, v) => s + v, 0) / taskDurations.length,
        )
      : null;

    // Tasks approved
    const tasksApproved = await this.prisma.task.count({
      where: {
        OR: [
          { approverAdminId: userFilter },
          { approverSupervisorId: userFilter },
        ],
      },
    });

    return {
      ticketsAnswered,
      avgResponseTime,
      tasksPerformed,
      avgTaskTime,
      tasksApproved,
      satisfiedTickets,
      dissatisfiedTickets,
    };
  }
}

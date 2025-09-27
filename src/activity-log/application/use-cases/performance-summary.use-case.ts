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
        supportTicket: { include: { interaction: true } },
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
      (a) => a.supportTicket.interaction.type === 'SATISFACTION',
    ).length;
    const dissatisfiedTickets = answers.filter(
      (a) => a.supportTicket.interaction.type === 'DISSATISFACTION',
    ).length;

    // Tasks performed and average task time
    const taskSubmissions = await this.prisma.taskSubmission.findMany({
      where: {
        OR: [
          { performerAdminId: userFilter },
          { performerSupervisorId: userFilter },
          { performerEmployeeId: userFilter },
        ],
      },
      select: {
        submittedAt: true,
        reviewedAt: true,
        status: true,
        task: {
          select: { createdAt: true, completedAt: true },
        },
      },
    });
    const tasksPerformed = taskSubmissions.length;
    const taskDurations = taskSubmissions
      .map((ts) => {
        // Calculate duration from task creation to submission review (approval/rejection)
        if (ts.reviewedAt && ts.task.createdAt) {
          return ts.reviewedAt.getTime() - ts.task.createdAt.getTime();
        }
        return null;
      })
      .filter((v): v is number => typeof v === 'number' && isFinite(v));
    const avgTaskTime = taskDurations.length
      ? Math.round(
          taskDurations.reduce((s, v) => s + v, 0) / taskDurations.length,
        )
      : null;

    // Tasks approved
    const tasksApproved = await this.prisma.taskSubmission.count({
      where: {
        status: 'APPROVED',
        OR: [
          { reviewedByAdminId: userFilter },
          { reviewedBySupervisorId: userFilter },
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

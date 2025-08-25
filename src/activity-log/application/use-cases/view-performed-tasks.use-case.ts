import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface ViewPerformedTasksInputDto {
  userId?: string;
}

export interface PerformedTaskRowDto {
  title: string;
  category: string | null; // using Department name as category surrogate
  timeTakenMs: number | null;
  status: string;
  dateSubmitted: Date;
  user?: { id: string; name: string };
}

@Injectable()
export class ViewPerformedTasksUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ViewPerformedTasksInputDto,
  ): Promise<PerformedTaskRowDto[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        OR: [
          {
            assignerAdminId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
          {
            assignerSupervisorId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
          {
            assigneeId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
        ],
      },
      select: {
        title: true,
        status: true,
        createdAt: true,
        completedAt: true,
        targetDepartment: { select: { name: true } },
        assignerAdmin: {
          select: { id: true, user: { select: { name: true } } },
        },
        assignerSupervisor: {
          select: { id: true, user: { select: { name: true } } },
        },
        assignee: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((t) => ({
      title: t.title,
      category: t.targetDepartment?.name ?? null,
      timeTakenMs: t.completedAt
        ? t.completedAt.getTime() - t.createdAt.getTime()
        : null,
      status: t.status,
      dateSubmitted: t.createdAt,
      user: input.userId
        ? undefined
        : t.assignerAdmin
          ? { id: t.assignerAdmin.id, name: t.assignerAdmin.user.name }
          : t.assignee
            ? {
                id: t.assignee.id,
                name: t.assignee.user.name,
              }
            : t.assignerSupervisor
              ? {
                  id: t.assignerSupervisor.id,
                  name: t.assignerSupervisor.user.name,
                }
              : undefined,
    }));
  }
}

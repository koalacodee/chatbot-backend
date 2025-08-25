import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface ViewApprovedTasksInputDto {
  userId?: string;
}

export interface ApprovedTaskRowDto {
  title: string;
  performerName: string | null;
  dateApproved: Date;
  user?: { id: string; name: string };
}

@Injectable()
export class ViewApprovedTasksUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ViewApprovedTasksInputDto,
  ): Promise<ApprovedTaskRowDto[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        OR: [
          {
            approverAdminId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
          {
            approverSupervisorId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
        ],
      },
      select: {
        title: true,
        updatedAt: true,
        performerAdmin: {
          select: { id: true, user: { select: { name: true } } },
        },
        performerSupervisor: {
          select: { id: true, user: { select: { name: true } } },
        },
        performerEmployee: {
          select: { id: true, user: { select: { name: true } } },
        },
        approverAdmin: {
          select: { id: true, user: { select: { name: true } } },
        },
        approverSupervisor: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((t) => ({
      title: t.title,
      performerName:
        t.performerAdmin?.user.name ??
        t.performerSupervisor?.user.name ??
        t.performerEmployee?.user.name ??
        null,
      dateApproved: t.updatedAt,
      user: input.userId
        ? undefined
        : t.approverAdmin
          ? { id: t.approverAdmin.id, name: t.approverAdmin.user.name }
          : t.approverSupervisor
            ? {
                id: t.approverSupervisor.id,
                name: t.approverSupervisor.user.name,
              }
            : undefined,
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface AggregateActivityFeedInputDto {
  userId?: string;
  limit?: number; // total items after merge
}

export type ActivityFeedItemType =
  | 'TICKET_ANSWERED'
  | 'TASK_PERFORMED'
  | 'TASK_APPROVED'
  | 'FAQ_CREATED'
  | 'FAQ_UPDATED'
  | 'PROMOTION_CREATED'
  | 'STAFF_REQUEST';

export interface ActivityFeedItemDto {
  type: ActivityFeedItemType;
  id: string; // underlying entity id
  title: string;
  timestamp: Date;
  meta?: Record<string, any>;
  user?: { id: string; name: string };
}

@Injectable()
export class AggregateActivityFeedUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: AggregateActivityFeedInputDto,
  ): Promise<ActivityFeedItemDto[]> {
    const pageSize = Math.max(1, Math.min(200, input.limit ?? 100));

    // Pull per-source up to pageSize items (they'll be merged and sliced later)
    const [
      answers,
      performedTasks,
      approvedTasks,
      faqCreated,
      promotions,
      staffReqs,
    ] = await Promise.all([
      this.prisma.supportTicketAnswer.findMany({
        where: {
          OR: [
            {
              answererAdminId: input.userId
                ? { equals: input.userId }
                : undefined,
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
        },
        select: {
          id: true,
          createdAt: true,
          rating: true,
          supportTicket: { select: { subject: true } },
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
        take: pageSize,
      }),
      this.prisma.task.findMany({
        where: {
          OR: [
            {
              performerAdminId: input.userId
                ? { equals: input.userId }
                : undefined,
            },
            {
              performerSupervisorId: input.userId
                ? { equals: input.userId }
                : undefined,
            },
            {
              performerEmployeeId: input.userId
                ? { equals: input.userId }
                : undefined,
            },
          ],
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          performerAdmin: {
            select: { id: true, user: { select: { name: true } } },
          },
          performerSupervisor: {
            select: { id: true, user: { select: { name: true } } },
          },
          performerEmployee: {
            select: { id: true, user: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
      }),
      this.prisma.task.findMany({
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
          id: true,
          title: true,
          updatedAt: true,
          approverAdmin: {
            select: { id: true, user: { select: { name: true } } },
          },
          approverSupervisor: {
            select: { id: true, user: { select: { name: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: pageSize,
      }),
      this.prisma.question.findMany({
        where: {
          OR: [
            {
              creatorAdminId: input.userId
                ? { equals: input.userId }
                : undefined,
            },
            {
              creatorSupervisorId: input.userId
                ? { equals: input.userId }
                : undefined,
            },
            {
              creatorEmployeeId: input.userId
                ? { equals: input.userId }
                : undefined,
            },
          ],
        },
        select: {
          id: true,
          text: true,
          createdAt: true,
          creatorAdmin: {
            select: { id: true, user: { select: { name: true } } },
          },
          creatorSupervisor: {
            select: { id: true, user: { select: { name: true } } },
          },
          creatorEmployee: {
            select: { id: true, user: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
      }),
      this.prisma.promotion.findMany({
        where: {
          OR: [
            {
              createdByAdminId: input.userId
                ? { equals: input.userId }
                : undefined,
            },
            {
              createdBySupervisorId: input.userId
                ? { equals: input.userId }
                : undefined,
            },
          ],
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          createdByAdmin: {
            select: { id: true, user: { select: { name: true } } },
          },
          createdBySupervisor: {
            select: { id: true, user: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
      }),
      this.prisma.employeeRequest.findMany({
        where: {
          requestedBySupervisorId: input.userId
            ? { equals: input.userId }
            : undefined,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          requestedBySupervisor: {
            select: { id: true, user: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
      }),
    ]);

    const items: ActivityFeedItemDto[] = [];

    for (const a of answers) {
      items.push({
        type: 'TICKET_ANSWERED',
        id: a.id,
        title: a.supportTicket?.subject ?? 'Ticket Answered',
        timestamp: a.createdAt,
        meta: { rating: a.rating ?? null },
        user: input.userId
          ? undefined
          : a.answererAdmin
            ? { id: a.answererAdmin.id, name: a.answererAdmin.user.name }
            : a.answererEmployee
              ? {
                  id: a.answererEmployee.id,
                  name: a.answererEmployee.user.name,
                }
              : a.answererSupervisor
                ? {
                    id: a.answererSupervisor.id,
                    name: a.answererSupervisor.user.name,
                  }
                : undefined,
      });
    }
    for (const t of performedTasks) {
      items.push({
        type: 'TASK_PERFORMED',
        id: t.id,
        title: t.title,
        timestamp: t.createdAt,
        user: input.userId
          ? undefined
          : t.performerAdmin
            ? { id: t.performerAdmin.id, name: t.performerAdmin.user.name }
            : t.performerEmployee
              ? {
                  id: t.performerEmployee.id,
                  name: t.performerEmployee.user.name,
                }
              : t.performerSupervisor
                ? {
                    id: t.performerSupervisor.id,
                    name: t.performerSupervisor.user.name,
                  }
                : undefined,
      });
    }
    for (const t of approvedTasks) {
      items.push({
        type: 'TASK_APPROVED',
        id: t.id,
        title: t.title,
        timestamp: t.updatedAt,
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
      });
    }
    for (const q of faqCreated) {
      items.push({
        type: 'FAQ_CREATED',
        id: q.id,
        title: q.text,
        timestamp: q.createdAt,
        user: input.userId
          ? undefined
          : q.creatorAdmin
            ? { id: q.creatorAdmin.id, name: q.creatorAdmin.user.name }
            : q.creatorEmployee
              ? {
                  id: q.creatorEmployee.id,
                  name: q.creatorEmployee.user.name,
                }
              : q.creatorSupervisor
                ? {
                    id: q.creatorSupervisor.id,
                    name: q.creatorSupervisor.user.name,
                  }
                : undefined,
      });
    }
    for (const p of promotions) {
      items.push({
        type: 'PROMOTION_CREATED',
        id: p.id,
        title: p.title,
        timestamp: p.createdAt,
        user: input.userId
          ? undefined
          : p.createdByAdmin
            ? { id: p.createdByAdmin.id, name: p.createdByAdmin.user.name }
            : p.createdBySupervisor
              ? {
                  id: p.createdBySupervisor.id,
                  name: p.createdBySupervisor.user.name,
                }
              : undefined,
      });
    }
    for (const r of staffReqs) {
      items.push({
        type: 'STAFF_REQUEST',
        id: r.id,
        title: `Staff request (${r.status})`,
        timestamp: r.createdAt,
        user: input.userId
          ? undefined
          : r.requestedBySupervisor
            ? {
                id: r.requestedBySupervisor.id,
                name: r.requestedBySupervisor.user.name,
              }
            : undefined,
      });
    }

    // Sort by timestamp desc and slice
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return items.slice(0, pageSize);
  }
}

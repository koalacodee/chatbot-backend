import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface ViewStaffRequestsInputDto {
  userId?: string; // supervisor id to filter by
  status?: string; // optional status filter
}

export interface StaffRequestRowDto {
  id: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  user?: { id: string; name: string };
}

@Injectable()
export class ViewStaffRequestsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ViewStaffRequestsInputDto,
  ): Promise<StaffRequestRowDto[]> {
    const rows = await this.prisma.employeeRequest.findMany({
      where: {
        requestedBySupervisorId: input.userId
          ? { equals: input.userId }
          : undefined,
        status: input.status ? (input.status as any) : undefined,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requestedBySupervisor: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.updatedAt ?? null,
      user: input.userId
        ? undefined
        : r.requestedBySupervisor
          ? {
              id: r.requestedBySupervisor.id,
              name: r.requestedBySupervisor.user.name,
            }
          : undefined,
    }));
  }
}

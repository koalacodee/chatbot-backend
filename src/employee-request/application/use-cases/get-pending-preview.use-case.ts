import { Injectable } from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';

export interface PendingPreviewItemDto {
  id: string;
  candidateName: string | null;
  requestedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface GetPendingPreviewResponseDto {
  total: number;
  items: PendingPreviewItemDto[];
}

@Injectable()
export class GetPendingPreviewUseCase {
  constructor(private readonly repo: EmployeeRequestRepository) {}

  async execute(limit: number = 5): Promise<GetPendingPreviewResponseDto> {
    const [total, itemsDomain] = await Promise.all([
      this.repo.countPending(),
      this.repo.findPending(0, limit),
    ]);

    const items: PendingPreviewItemDto[] = itemsDomain.map((req) => ({
      id: req.id,
      candidateName: req.newEmployeeFullName ?? null,
      requestedBy: req.requestedBySupervisor?.user
        ? {
            id: req.requestedBySupervisor.user.id,
            name: req.requestedBySupervisor.user.name,
          }
        : null,
      createdAt: req.createdAt.toISOString(),
    }));

    return { total, items };
  }
}

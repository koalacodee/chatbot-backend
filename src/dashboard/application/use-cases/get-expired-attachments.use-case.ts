import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';

export interface ExpiredAttachment {
  id: string;
  filename: string;
  originalName: string;
  expirationDate: Date;
  userId: string | null;
  guestId: string | null;
  isGlobal: boolean;
}

@Injectable()
export class GetExpiredAttachmentsUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(): Promise<ExpiredAttachment[]> {
    return this.repo.getExpiredAttachments();
  }
}

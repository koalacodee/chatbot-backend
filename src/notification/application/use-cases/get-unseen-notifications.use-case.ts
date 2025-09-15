import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  UnseenNotificationsResult,
} from 'src/notification/domain/repositories/notification.repository';

interface GetUnseenNotificationsInput {
  userId: string;
}

@Injectable()
export class GetUnseenNotificationsUseCase {
  constructor(
    private readonly notificationsRepository: NotificationRepository,
  ) {}

  async execute({
    userId,
  }: GetUnseenNotificationsInput): Promise<UnseenNotificationsResult> {
    const [result] = await Promise.all([
      this.notificationsRepository.findUnseenNotifications(userId),
      this.notificationsRepository.markAllAsSeen(userId),
    ]);

    return result;
  }
}

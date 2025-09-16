import { BadRequestException, Injectable } from '@nestjs/common';
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
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    console.log(userId);

    // First, get the unseen notifications
    const result =
      await this.notificationsRepository.findUnseenNotifications(userId);

    // Then, mark only the fetched notifications as seen for this specific user
    if (result.notifications.length > 0) {
      const notificationIds = result.notifications.map((n) => n.id);
      await this.notificationsRepository.markNotificationsAsSeen(
        userId,
        notificationIds,
      );
    }

    return result;
  }
}

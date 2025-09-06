import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';

interface GetUnseenNotificationsInput {
  userId: string;
}

export class GetUnseenNotificationsUseCase {
  constructor(
    private readonly notificationsRepository: NotificationRepository,
  ) {}

  async execute({ userId }: GetUnseenNotificationsInput) {
    const [notifications] = await Promise.all([
      this.notificationsRepository.findUnseenNotifications(userId),
      this.notificationsRepository.markAllAsSeen(userId),
    ]);

    return notifications;
  }
}

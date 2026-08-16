import { BadRequestException } from '@nestjs/common';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Notification } from '../../domain/entities/notification.entity';
import {
  NotificationRepository,
  UnseenNotificationsResult,
} from '../../domain/repositories/notification.repository';
import { GetUnseenNotificationsUseCase } from './get-unseen-notifications.use-case';

const USER_ID = '018f4a1e-1c7a-7000-8000-000000000f01';

const buildNotification = (title: string, type = 'task_created') =>
  Notification.create({ title, type });

function build(unseen: Notification[] = []) {
  const marked: Array<{ userId: string; ids: string[] }> = [];

  const counts: Record<string, number> = {};
  for (const notification of unseen) {
    counts[notification.type] = (counts[notification.type] || 0) + 1;
  }

  const repository = stubRepository<NotificationRepository>(
    'NotificationRepository',
    {
      findUnseenNotifications: async (): Promise<UnseenNotificationsResult> => ({
        notifications: unseen,
        counts,
      }),
      markNotificationsAsSeen: async (userId: string, ids: string[]) => {
        marked.push({ userId, ids });
      },
    },
  );

  return { marked, useCase: new GetUnseenNotificationsUseCase(repository) };
}

/**
 * A read that mutates: fetching unseen notifications also marks them seen. The contract
 * that matters is that it marks *exactly* what it returned — marking more would silently
 * swallow notifications that arrived between the two calls.
 */
describe('GetUnseenNotificationsUseCase', () => {
  it('rejects a missing user id', async () => {
    const { useCase } = build();

    await expect(useCase.execute({ userId: '' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an undefined user id', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ userId: undefined as any }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns the notifications and their per-type counts', async () => {
    const { useCase } = build([
      buildNotification('Task A'),
      buildNotification('Task B'),
      buildNotification('Ticket', 'ticket_created'),
    ]);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.notifications).toHaveLength(3);
    expect(result.counts).toEqual({ task_created: 2, ticket_created: 1 });
  });

  it('marks exactly the notifications it returned, for that user', async () => {
    const notifications = [buildNotification('A'), buildNotification('B')];
    const { useCase, marked } = build(notifications);

    await useCase.execute({ userId: USER_ID });

    expect(marked).toEqual([
      { userId: USER_ID, ids: notifications.map((n) => n.id) },
    ]);
  });

  /**
   * The guard exists so an empty read does not issue a blanket update — `markAllAsSeen`
   * is a different method precisely because this one must stay scoped.
   */
  it('does not touch anything when there is nothing unseen', async () => {
    const { useCase, marked } = build([]);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.notifications).toEqual([]);
    expect(marked).toHaveLength(0);
  });

  it('still returns the notifications it just marked', async () => {
    const { useCase } = build([buildNotification('A')]);

    const result = await useCase.execute({ userId: USER_ID });

    // The result is the pre-mark snapshot — the caller sees them once.
    expect(result.notifications).toHaveLength(1);
  });
});

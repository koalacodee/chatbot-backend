import { NotificationCreatedEvent } from '../events/notification-created.event';
import { NotificationRecipient } from './notification-recipient.entity';
import { Notification } from './notification.entity';

const NOTIFICATION_ID = '018f4a1e-1c7a-7000-8000-000000000f10';
const USER_ID = '018f4a1e-1c7a-7000-8000-000000000f11';
const OTHER_USER_ID = '018f4a1e-1c7a-7000-8000-000000000f12';

const build = (overrides = {}) =>
  Notification.create({
    id: NOTIFICATION_ID,
    title: 'Task assigned',
    type: 'task_created',
    ...overrides,
  });

describe('Notification', () => {
  describe('construction', () => {
    it('keeps a supplied id', () => {
      expect(build().id).toBe(NOTIFICATION_ID);
    });

    it('generates an id when none is given', () => {
      expect(Notification.create({ title: 't', type: 'x' }).id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('defaults to no recipients', () => {
      expect(build().recipients).toEqual([]);
    });

    it('keeps supplied recipients', () => {
      const recipient = NotificationRecipient.create({
        notificationId: NOTIFICATION_ID,
        userId: USER_ID,
      });

      expect(build({ recipients: [recipient] }).recipients).toEqual([
        recipient,
      ]);
    });

    it('defaults both timestamps to now', () => {
      const before = Date.now();
      const notification = build();

      expect(notification.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(notification.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('type is a free-form string, not an enum', () => {
      expect(build({ type: 'anything_at_all' }).type).toBe('anything_at_all');
    });
  });

  describe('events', () => {
    it('raises a created event on construction', () => {
      const notification = build();

      expect(notification.events).toHaveLength(1);
      expect(notification.events[0]).toBeInstanceOf(NotificationCreatedEvent);
    });

    /**
     * Reconstitution is a separate entry point precisely so a notification read back from
     * storage does not arrive carrying an unpublished created event — otherwise any
     * generic "flush events after load" would re-fire the entire notification history.
     */
    it('raises none on a notification rebuilt from storage', () => {
      const loaded = Notification.fromPersistence({
        id: NOTIFICATION_ID,
        title: 'Task assigned',
        type: 'task_created',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      });

      expect(loaded.events).toEqual([]);
    });

    it('rebuilt notifications are otherwise identical', () => {
      const options = {
        id: NOTIFICATION_ID,
        title: 'Task assigned',
        type: 'task_created',
      };

      const loaded = Notification.fromPersistence(options);

      expect(loaded.id).toBe(NOTIFICATION_ID);
      expect(loaded.title).toBe('Task assigned');
      expect(loaded.type).toBe('task_created');
    });
  });

  describe('recipients', () => {
    it('addRecipient appends a recipient bound to this notification', () => {
      const notification = build();

      notification.addRecipient(USER_ID);

      expect(notification.recipients).toHaveLength(1);
      expect(notification.recipients[0].userId).toBe(USER_ID);
      expect(notification.recipients[0].notificationId).toBe(NOTIFICATION_ID);
    });

    it('new recipients start unseen', () => {
      const notification = build();

      notification.addRecipient(USER_ID);

      expect(notification.recipients[0].seen).toBe(false);
    });

    it('preserves the order recipients were added in', () => {
      const notification = build();

      notification.addRecipient(USER_ID);
      notification.addRecipient(OTHER_USER_ID);

      expect(notification.recipients.map((r) => r.userId)).toEqual([
        USER_ID,
        OTHER_USER_ID,
      ]);
    });

    /**
     * The entity holds this invariant itself, so a caller adding the same person twice
     * cannot produce duplicate recipient rows. The resolver still deduplicates, but that
     * is now defence in depth rather than the only guard.
     */
    it('ignores the same user added twice', () => {
      const notification = build();

      notification.addRecipient(USER_ID);
      notification.addRecipient(USER_ID);

      expect(notification.recipients).toHaveLength(1);
    });

    it('still accepts a genuinely different user afterwards', () => {
      const notification = build();

      notification.addRecipient(USER_ID);
      notification.addRecipient(USER_ID);
      notification.addRecipient(OTHER_USER_ID);

      expect(notification.recipients.map((r) => r.userId)).toEqual([
        USER_ID,
        OTHER_USER_ID,
      ]);
    });

    it('recipients can be replaced wholesale', () => {
      const notification = build();
      notification.addRecipient(USER_ID);

      notification.recipients = [];

      expect(notification.recipients).toEqual([]);
    });
  });
});

describe('NotificationRecipient', () => {
  const build = (overrides = {}) =>
    NotificationRecipient.create({
      notificationId: NOTIFICATION_ID,
      userId: USER_ID,
      ...overrides,
    });

  it('generates an id when none is given', () => {
    expect(build().id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('defaults to unseen', () => {
    expect(build().seen).toBe(false);
  });

  it('keeps an explicit seen flag', () => {
    expect(build({ seen: true }).seen).toBe(true);
  });

  it('can be marked seen', () => {
    const recipient = build();

    recipient.seen = true;

    expect(recipient.seen).toBe(true);
  });

  it('exposes the link to its notification and user', () => {
    const recipient = build();

    expect(recipient.notificationId).toBe(NOTIFICATION_ID);
    expect(recipient.userId).toBe(USER_ID);
  });

  it('serialises to the persistence shape', () => {
    expect(build({ seen: true }).toJSON()).toMatchObject({
      notificationId: NOTIFICATION_ID,
      userId: USER_ID,
      seen: true,
    });
  });
});

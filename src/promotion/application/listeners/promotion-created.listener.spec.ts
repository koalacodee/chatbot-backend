import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { FakeActivityLogRepository } from 'src/activity-log/__fixtures__/fake-activity-log.repository';
import { AudienceType } from '../../domain/entities/promotion.entity';
import { PromotionCreatedEvent } from '../../domain/events/promotion-created.event';
import { PromotionCreatedListener } from './promotion-created.listener';

const PROMOTION_ID = '018f4a1e-1c7a-7000-8000-0000000000f1';
const USER_ID = '018f4a1e-1c7a-7000-8000-0000000000e1';
const OCCURRED_AT = new Date('2026-08-16T10:00:00.000Z');

function build() {
  const logs = new FakeActivityLogRepository();

  return { logs, listener: new PromotionCreatedListener(logs) };
}

/**
 * The event as `CreatePromotionUseCase` actually publishes it — no cast needed now that
 * there is one class rather than two.
 */
const domainEvent = (audience: AudienceType = AudienceType.CUSTOMER) =>
  new PromotionCreatedEvent(
    'Summer sale',
    PROMOTION_ID,
    USER_ID,
    OCCURRED_AT,
    audience,
  );

describe('PromotionCreatedListener', () => {
  /**
   * The listener used to declare its own `PromotionCreatedEvent` and its own
   * `AudienceType`, shadowing the domain pair. The subscription held only because both
   * classes happened to be spelled the same, and the two types were structurally
   * incompatible on `audience` — the handler could not accept what the use-case emitted
   * except through `EventEmitter2` erasing it to `any`.
   *
   * Both now come from `domain/`, so the compiler guards the wiring. This asserts the
   * duplicates are gone: a re-declared local class would make these two constants
   * different objects again.
   */
  it('binds to the domain event, not a local copy of it', () => {
    const listenerModule = require('./promotion-created.listener');
    const domainModule = require('../../domain/events/promotion-created.event');

    expect(listenerModule.PromotionCreatedEvent).toBeUndefined();
    expect(listenerModule.AudienceType).toBeUndefined();
    expect(domainModule.PromotionCreatedEvent).toBe(PromotionCreatedEvent);
  });

  it('writes a PROMOTION_CREATED activity log', async () => {
    const { listener, logs } = build();

    await listener.handlePromotionCreatedEvent(domainEvent());

    const [log] = [...logs.logs.values()];
    expect(log.type).toBe(ActivityLogType.PROMOTION_CREATED);
    expect(log.title).toBe('Summer sale');
    expect(log.itemId).toBe(PROMOTION_ID);
    expect(log.userId).toBe(USER_ID);
  });

  it('keeps the moment the promotion was created, not the moment it was logged', async () => {
    const { listener, logs } = build();

    await listener.handlePromotionCreatedEvent(domainEvent());

    const [log] = [...logs.logs.values()];
    expect(log.occurredAt).toEqual(OCCURRED_AT);
  });

  it.each([
    AudienceType.CUSTOMER,
    AudienceType.EMPLOYEE,
    AudienceType.SUPERVISOR,
    AudienceType.ALL,
  ])('records the %s audience in the log meta', async (audience) => {
    const { listener, logs } = build();

    await listener.handlePromotionCreatedEvent(domainEvent(audience));

    const [log] = [...logs.logs.values()];
    expect(log.meta).toEqual({ audience });
  });

  it('writes one log per event', async () => {
    const { listener, logs } = build();

    await listener.handlePromotionCreatedEvent(domainEvent());
    await listener.handlePromotionCreatedEvent(domainEvent());

    expect(logs.logs.size).toBe(2);
  });

  /**
   * The handler still does not catch — but `CreatePromotionUseCase` now logs the
   * rejection instead of letting it fail the create, so this rejection is contained at
   * the publisher rather than reaching the client.
   */
  it('propagates a repository failure to the publisher', async () => {
    const { listener, logs } = build();
    jest.spyOn(logs, 'save').mockRejectedValue(new Error('log store down'));

    await expect(
      listener.handlePromotionCreatedEvent(domainEvent()),
    ).rejects.toThrow('log store down');
  });
});

import { Guest } from 'src/guest/domain/entities/guest.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

const GUEST_ID = '018f4a1e-1c7a-7000-8000-0000000000f1';

const buildGuest = () =>
  Guest.create({
    id: GUEST_ID,
    name: 'Dana',
    email: 'dana@example.com',
  });

const buildMessage = (content: string) =>
  Message.create({ role: 'user', content });

describe('Conversation', () => {
  describe('construction', () => {
    it('generates an id when none is supplied', () => {
      const conversation = Conversation.create({});

      expect(conversation.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('keeps a supplied id', () => {
      const id = UUID.create();

      expect(Conversation.create({ id }).id).toBe(id);
    });

    it('defaults startedAt and updatedAt to now', () => {
      const before = Date.now();
      const conversation = Conversation.create({});
      const after = Date.now();

      expect(conversation.startedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(conversation.startedAt.getTime()).toBeLessThanOrEqual(after);
      expect(conversation.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('starts with no messages and no chunks', () => {
      const conversation = Conversation.create({});

      expect(conversation.messages).toEqual([]);
      expect(conversation.retrievedChunks).toEqual([]);
      expect(conversation.endedAt).toBeUndefined();
    });

    /**
     * `anonymousId` is optional, but the constructor always pipes it through
     * `UUID.create()`, which generates one when given undefined. So every conversation
     * carries an anonymousId — including guest-owned ones — and a fresh random value is
     * minted on each load from the database, since the repository does not persist it.
     */
    it('always has an anonymousId, even when none was given', () => {
      const conversation = Conversation.create({});

      expect(conversation.anonymousId).toBeDefined();
      expect(conversation.anonymousId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('mints a different anonymousId for each construction', () => {
      expect(Conversation.create({}).anonymousId.value).not.toBe(
        Conversation.create({}).anonymousId.value,
      );
    });
  });

  describe('messages', () => {
    it('appends through addMessage', () => {
      const conversation = Conversation.create({});
      const message = buildMessage('hello');

      conversation.addMessage(message);

      expect(conversation.messages).toEqual([message]);
    });

    it('preserves insertion order', () => {
      const conversation = Conversation.create({});
      const first = buildMessage('first');
      const second = buildMessage('second');

      conversation.addMessage(first);
      conversation.addMessage(second);

      expect(conversation.messages.map((m) => m.content)).toEqual([
        'first',
        'second',
      ]);
    });

    it('hands out a copy, so external mutation cannot corrupt the thread', () => {
      const conversation = Conversation.create({});
      conversation.addMessage(buildMessage('kept'));

      conversation.messages.push(buildMessage('smuggled'));

      expect(conversation.messages).toHaveLength(1);
    });

    it('hands out a copy of retrievedChunks too', () => {
      const conversation = Conversation.create({});

      conversation.retrievedChunks.push({} as any);

      expect(conversation.retrievedChunks).toEqual([]);
    });
  });

  describe('ending', () => {
    it('starts open', () => {
      expect(Conversation.create({}).isEnded()).toBe(false);
    });

    it('is ended once end() is called', () => {
      const conversation = Conversation.create({});

      conversation.end();

      expect(conversation.isEnded()).toBe(true);
      expect(conversation.endedAt).toBeInstanceOf(Date);
    });

    // end() guards on isEnded(), so the original close time survives a second call.
    it('does not move endedAt on a second end()', () => {
      const conversation = Conversation.create({});

      conversation.end();
      const firstEndedAt = conversation.endedAt;
      conversation.end();

      expect(conversation.endedAt).toBe(firstEndedAt);
    });

    it('treats a conversation built with endedAt as already ended', () => {
      const endedAt = new Date('2025-01-01T00:00:00.000Z');

      expect(Conversation.create({ endedAt }).isEnded()).toBe(true);
    });

    it('can be reopened by clearing endedAt', () => {
      const conversation = Conversation.create({ endedAt: new Date() });

      conversation.endedAt = undefined;

      expect(conversation.isEnded()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('serialises a guest-owned conversation', () => {
      const startedAt = new Date('2025-01-01T00:00:00.000Z');
      const conversation = Conversation.create({
        guest: buildGuest(),
        startedAt,
      });
      conversation.addMessage(buildMessage('hello'));

      const json = conversation.toJSON();

      expect(json.guestId).toBe(GUEST_ID);
      expect(json.startedAt).toBe('2025-01-01T00:00:00.000Z');
      expect(json.endedAt).toBeUndefined();
      expect(json.messages).toHaveLength(1);
    });

    it('serialises endedAt once the conversation is closed', () => {
      const conversation = Conversation.create({
        guest: buildGuest(),
        endedAt: new Date('2025-02-01T00:00:00.000Z'),
      });

      expect(conversation.toJSON().endedAt).toBe('2025-02-01T00:00:00.000Z');
    });

    /**
     * The guest is dereferenced unguarded (`this._guest.id.value`), so serialising a
     * conversation that was loaded without its guest throws. This is why the Drizzle
     * repository joins `guests` on every read — the Prisma version did not, and both
     * conversation endpoints returned 500s as a result. Pinned so the join is never
     * quietly dropped as an optimisation.
     */
    it('throws when no guest is attached', () => {
      const conversation = Conversation.create({});

      expect(() => conversation.toJSON()).toThrow(TypeError);
    });

    // Unlike `id`, anonymousId is emitted as the value object rather than its string.
    it('emits anonymousId as a UUID instance, not a string', () => {
      const conversation = Conversation.create({ guest: buildGuest() });

      expect(conversation.toJSON().anonymousId).toBeInstanceOf(UUID);
      expect(typeof conversation.toJSON().id).toBe('string');
    });
  });
});

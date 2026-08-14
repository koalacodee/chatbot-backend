import { BadRequestException } from '@nestjs/common';
import { Message } from './message.entity';

const MESSAGE_ID = '018f4a1e-1c7a-7000-8000-0000000000e1';
const CONVERSATION_ID = '018f4a1e-1c7a-7000-8000-0000000000e2';

describe('Message', () => {
  describe('construction', () => {
    it('keeps a supplied id', () => {
      const message = Message.create({
        id: MESSAGE_ID,
        role: 'user',
        content: 'hello',
      });

      expect(message.id.value).toBe(MESSAGE_ID);
    });

    it('generates an id when none is given', () => {
      const message = Message.create({ role: 'user', content: 'hello' });

      expect(message.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('rejects a malformed id', () => {
      expect(() =>
        Message.create({ id: 'nope', role: 'user', content: 'hi' }),
      ).toThrow(BadRequestException);
    });

    /**
     * `conversationId` is optional on the options type and the getter is typed
     * `UUID | undefined`, but the constructor pipes it through `UUID.create()`, which
     * *generates* one when handed undefined. So an orphan message silently acquires a
     * conversation id pointing at nothing — it is never actually undefined.
     */
    it('invents a conversationId instead of leaving it undefined', () => {
      const message = Message.create({ role: 'user', content: 'hello' });

      expect(message.conversationId).toBeDefined();
      expect(message.conversationId?.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('keeps a supplied conversationId', () => {
      const message = Message.create({
        role: 'user',
        content: 'hello',
        conversationId: CONVERSATION_ID,
      });

      expect(message.conversationId?.value).toBe(CONVERSATION_ID);
    });

    it('defaults both timestamps to the same instant', () => {
      const message = Message.create({ role: 'user', content: 'hello' });

      expect(message.createdAt).toEqual(message.updatedAt);
    });

    it('keeps supplied timestamps', () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const updatedAt = new Date('2025-01-02T00:00:00.000Z');

      const message = Message.create({
        role: 'user',
        content: 'hello',
        createdAt,
        updatedAt,
      });

      expect(message.createdAt).toEqual(createdAt);
      expect(message.updatedAt).toEqual(updatedAt);
    });

    it('stores role verbatim — it is a free-form string, not an enum', () => {
      expect(Message.create({ role: 'USER', content: 'x' }).role).toBe('USER');
      expect(Message.create({ role: 'assistant', content: 'x' }).role).toBe(
        'assistant',
      );
    });
  });

  describe('mutation', () => {
    it('bumps updatedAt when content changes', () => {
      const updatedAt = new Date('2025-01-01T00:00:00.000Z');
      const message = Message.create({
        role: 'user',
        content: 'first',
        updatedAt,
      });

      message.content = 'second';

      expect(message.content).toBe('second');
      expect(message.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime());
    });

    it('bumps updatedAt when the conversation changes', () => {
      const updatedAt = new Date('2025-01-01T00:00:00.000Z');
      const message = Message.create({
        role: 'user',
        content: 'hello',
        updatedAt,
      });
      const other = Message.create({
        role: 'user',
        content: 'x',
        conversationId: CONVERSATION_ID,
      });

      message.conversationId = other.conversationId;

      expect(message.conversationId?.value).toBe(CONVERSATION_ID);
      expect(message.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime());
    });

    it('leaves createdAt alone on mutation', () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const message = Message.create({
        role: 'user',
        content: 'first',
        createdAt,
      });

      message.content = 'second';

      expect(message.createdAt).toEqual(createdAt);
    });
  });

  describe('equals', () => {
    it('compares by id, ignoring content', () => {
      const first = Message.create({
        id: MESSAGE_ID,
        role: 'user',
        content: 'one',
      });
      const second = Message.create({
        id: MESSAGE_ID,
        role: 'assistant',
        content: 'two',
      });

      expect(first.equals(second)).toBe(true);
    });

    it('is false for different ids', () => {
      const first = Message.create({ role: 'user', content: 'same' });
      const second = Message.create({ role: 'user', content: 'same' });

      expect(first.equals(second)).toBe(false);
    });
  });

  describe('clone', () => {
    it('produces an equal but distinct instance', () => {
      const original = Message.create({
        id: MESSAGE_ID,
        role: 'user',
        content: 'hello',
        conversationId: CONVERSATION_ID,
      });

      const copy = original.clone();

      expect(copy).not.toBe(original);
      expect(copy.equals(original)).toBe(true);
      expect(copy.toJSON()).toEqual(original.toJSON());
    });

    it('copies the dates rather than sharing them', () => {
      const original = Message.create({ role: 'user', content: 'hello' });

      const copy = original.clone();

      expect(copy.createdAt).not.toBe(original.createdAt);
      expect(copy.createdAt).toEqual(original.createdAt);
    });

    it('leaves the original untouched when the copy is edited', () => {
      const original = Message.create({ role: 'user', content: 'original' });

      const copy = original.clone();
      copy.content = 'edited';

      expect(original.content).toBe('original');
    });
  });

  describe('toJSON', () => {
    it('emits ids as strings and timestamps as ISO strings', () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const updatedAt = new Date('2025-01-02T00:00:00.000Z');

      const message = Message.create({
        id: MESSAGE_ID,
        conversationId: CONVERSATION_ID,
        role: 'user',
        content: 'hello',
        createdAt,
        updatedAt,
      });

      expect(message.toJSON()).toEqual({
        id: MESSAGE_ID,
        conversationId: CONVERSATION_ID,
        role: 'user',
        content: 'hello',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });
    });
  });
});

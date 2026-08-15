import { KnowledgeChunk } from 'src/knowledge-chunks/domain/entities/knowledge-chunk.entity';
import { RetrievedChunk } from './retrieved-chunk.entity';

const CHUNK_ID = '018f4a1e-1c7a-7000-8000-000000000101';
const MESSAGE_ID = '018f4a1e-1c7a-7000-8000-000000000102';
const DEPARTMENT_ID = '018f4a1e-1c7a-7000-8000-000000000103';

const buildKnowledgeChunk = () =>
  KnowledgeChunk.create({
    content: 'Refunds are processed within 5 days.',
    departmentId: DEPARTMENT_ID,
  });

const build = (overrides = {}) =>
  RetrievedChunk.create({
    messageId: MESSAGE_ID,
    knowledgeChunk: buildKnowledgeChunk(),
    score: 0.87,
    ...overrides,
  });

describe('RetrievedChunk', () => {
  describe('construction', () => {
    it('keeps a supplied id', () => {
      expect(build({ id: CHUNK_ID }).id).toBe(CHUNK_ID);
    });

    it('generates an id when none is given', () => {
      expect(build().id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    /**
     * Unlike the other entities this one uses `crypto.randomUUID()` directly rather than
     * the UUID value object, so the id is a plain string and is never validated.
     */
    it('accepts an id the UUID value object would reject', () => {
      expect(build({ id: 'not-a-uuid' }).id).toBe('not-a-uuid');
    });

    it('defaults retrievedAt to now', () => {
      const before = Date.now();
      const chunk = build();
      const after = Date.now();

      expect(chunk.retrievedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(chunk.retrievedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('keeps a supplied retrievedAt', () => {
      const retrievedAt = new Date('2025-01-01T00:00:00.000Z');

      expect(build({ retrievedAt }).retrievedAt).toEqual(retrievedAt);
    });

    it('stores the score as given, including the 1.0 the save path uses', () => {
      expect(build({ score: 1.0 }).score).toBe(1);
      expect(build({ score: 0 }).score).toBe(0);
    });
  });

  describe('mutation', () => {
    it('allows the message link to be repointed', () => {
      const chunk = build();

      chunk.messageId = 'other-message';

      expect(chunk.messageId).toBe('other-message');
    });

    it('allows the score to be replaced', () => {
      const chunk = build();

      chunk.score = 0.1;

      expect(chunk.score).toBe(0.1);
    });
  });

  describe('equals', () => {
    it('compares by id', () => {
      expect(build({ id: CHUNK_ID }).equals(build({ id: CHUNK_ID }))).toBe(true);
    });

    it('is false for different ids', () => {
      expect(build().equals(build())).toBe(false);
    });
  });


  describe('toJSON', () => {
    it('nests the serialised knowledge chunk and stringifies the date', () => {
      const retrievedAt = new Date('2025-01-01T00:00:00.000Z');
      const chunk = build({ id: CHUNK_ID, retrievedAt });

      const json = chunk.toJSON();

      expect(json).toMatchObject({
        id: CHUNK_ID,
        messageId: MESSAGE_ID,
        score: 0.87,
        retrievedAt: '2025-01-01T00:00:00.000Z',
      });
      expect(json.knowledgeChunk).toMatchObject({
        content: 'Refunds are processed within 5 days.',
      });
    });

    /**
     * The knowledge chunk is dereferenced unguarded, so a RetrievedChunk built without
     * one cannot be serialised. That is exactly what the Prisma `save` used to return —
     * it re-read the row with no `include` — which is why the Drizzle version hands back
     * the caller's chunk instead.
     */
    it('throws when no knowledge chunk is attached', () => {
      const chunk = build({ knowledgeChunk: undefined });

      expect(() => chunk.toJSON()).toThrow(TypeError);
    });
  });
});

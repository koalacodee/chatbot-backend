import { activityLogs } from 'src/common/drizzle/schema';
import { ActivityLogType } from '../../domain/entities/activity-log.entity';
import {
  DB_TO_DOMAIN,
  DOMAIN_TO_DB,
  RECENT_ACTIVITY_DESCRIPTION,
  RECENT_ACTIVITY_KIND,
} from './drizzle-activity-log.repository';

/**
 * These tables are the seam Prisma used to hide. Its `@map` directives translated
 * SCREAMING_CASE domain names to the lowercase labels Postgres stores; Drizzle does not,
 * so the translation is hand-written — and it fails *silently*. A wrong label does not
 * throw on read, it just yields a type the domain enum has no member for, and on write it
 * fails the enum check at the database rather than in review.
 *
 * The load-bearing assertion is the one comparing against `activityLogs.type.enumValues`,
 * which is generated from the real Postgres enum. Without it these tests would only prove
 * the tables agree with themselves.
 */
describe('activity log type mappings', () => {
  const domainValues = Object.values(ActivityLogType);
  const dbLabels = activityLogs.type.enumValues;

  describe('DOMAIN_TO_DB', () => {
    it('covers every domain enum member', () => {
      expect(Object.keys(DOMAIN_TO_DB).sort()).toEqual([...domainValues].sort());
    });

    it('only produces labels that exist in the Postgres enum', () => {
      for (const label of Object.values(DOMAIN_TO_DB)) {
        expect(dbLabels).toContain(label);
      }
    });

    it('is injective — no two domain members share a label', () => {
      const labels = Object.values(DOMAIN_TO_DB);

      expect(new Set(labels).size).toBe(labels.length);
    });

    it('reaches every label the Postgres enum defines', () => {
      expect([...Object.values(DOMAIN_TO_DB)].sort()).toEqual(
        [...dbLabels].sort(),
      );
    });
  });

  describe('DB_TO_DOMAIN', () => {
    it('covers every Postgres label', () => {
      expect(Object.keys(DB_TO_DOMAIN).sort()).toEqual([...dbLabels].sort());
    });

    it('only produces members of the domain enum', () => {
      for (const value of Object.values(DB_TO_DOMAIN)) {
        expect(domainValues).toContain(value);
      }
    });
  });

  describe('round trips', () => {
    it.each(domainValues)('domain -> db -> domain preserves %s', (value) => {
      expect(DB_TO_DOMAIN[DOMAIN_TO_DB[value]]).toBe(value);
    });

    it.each([...dbLabels])('db -> domain -> db preserves %s', (label) => {
      expect(DOMAIN_TO_DB[DB_TO_DOMAIN[label]]).toBe(label);
    });
  });

  /**
   * Pins the exact wire values. The round-trip tests above would still pass if every
   * label were renamed consistently, but the database would not.
   */
  it('maps each member to its documented label', () => {
    expect(DOMAIN_TO_DB).toEqual({
      [ActivityLogType.TICKET_ANSWERED]: 'ticket_answered',
      [ActivityLogType.TASK_PERFORMED]: 'task_performed',
      [ActivityLogType.TASK_APPROVED]: 'task_approved',
      [ActivityLogType.FAQ_CREATED]: 'faq_created',
      [ActivityLogType.FAQ_UPDATED]: 'faq_updated',
      [ActivityLogType.PROMOTION_CREATED]: 'promotion_created',
      [ActivityLogType.STAFF_REQUEST_CREATED]: 'staff_request_created',
    });
  });
});

describe('recent activity presentation', () => {
  const dbLabels = activityLogs.type.enumValues;

  describe('RECENT_ACTIVITY_KIND', () => {
    it('handles every Postgres label', () => {
      expect(Object.keys(RECENT_ACTIVITY_KIND).sort()).toEqual(
        [...dbLabels].sort(),
      );
    });

    it('only emits kinds the repository contract declares', () => {
      const allowed = ['ticket', 'task', 'faq', 'user', 'promotion'];

      for (const kind of Object.values(RECENT_ACTIVITY_KIND)) {
        expect(allowed).toContain(kind);
      }
    });

    it.each([
      ['ticket_answered', 'ticket'],
      ['task_performed', 'task'],
      ['task_approved', 'task'],
      ['faq_created', 'faq'],
      ['faq_updated', 'faq'],
      ['promotion_created', 'promotion'],
      ['staff_request_created', 'user'],
    ] as const)('buckets %s as %s', (label, kind) => {
      expect(RECENT_ACTIVITY_KIND[label]).toBe(kind);
    });
  });

  describe('RECENT_ACTIVITY_DESCRIPTION', () => {
    it('handles every Postgres label', () => {
      expect(Object.keys(RECENT_ACTIVITY_DESCRIPTION).sort()).toEqual(
        [...dbLabels].sort(),
      );
    });

    it.each([
      ['ticket_answered', 'Ticket Onboarding answered'],
      ['task_performed', 'Task Onboarding performed'],
      ['task_approved', 'Task Onboarding approved'],
      ['faq_created', 'FAQ Onboarding created'],
      ['faq_updated', 'FAQ Onboarding updated'],
      ['promotion_created', 'Promotion Onboarding created'],
      ['staff_request_created', 'User Onboarding requested'],
    ] as const)('describes %s', (label, expected) => {
      expect(RECENT_ACTIVITY_DESCRIPTION[label]('Onboarding')).toBe(expected);
    });

    it('interpolates the title verbatim, including empty titles', () => {
      expect(RECENT_ACTIVITY_DESCRIPTION.ticket_answered('')).toBe(
        'Ticket  answered',
      );
    });
  });
});

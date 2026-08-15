import {
  InMemoryRedis,
  createInMemoryRedis,
} from '../../__fixtures__/in-memory-redis.service';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';
import {
  EmployeeInvitationService,
  InvitationStatus,
} from './employee-invitation.service';

const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-000000000901';
const REQUESTER = '018f4a1e-1c7a-7000-8000-000000000902';
const OTHER_REQUESTER = '018f4a1e-1c7a-7000-8000-000000000903';
const APPROVER = '018f4a1e-1c7a-7000-8000-000000000904';

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const INDEX_KEY = 'employee_invitations_index';

const invitation = (overrides = {}) => ({
  fullName: 'New Hire',
  email: 'hire@example.com',
  jobTitle: 'Agent',
  supervisorId: SUPERVISOR_ID,
  subDepartmentIds: ['018f4a1e-1c7a-7000-8000-000000000910'],
  permissions: [EmployeePermissionsEnum.HANDLE_TICKETS],
  status: InvitationStatus.PENDING_APPROVAL,
  requestedBy: REQUESTER,
  ...overrides,
});

describe('EmployeeInvitationService', () => {
  let redis: InMemoryRedis;
  let service: EmployeeInvitationService;

  beforeEach(() => {
    redis = createInMemoryRedis();
    service = new EmployeeInvitationService(redis.service);
  });

  /** Rewrites a stored invitation's expiry without going through the service. */
  const expireStored = (token: string, expiresAt: Date) => {
    const key = `employee_invitation:${token}`;
    const stored = JSON.parse(redis.strings.get(key)!);
    stored.expiresAt = expiresAt.toISOString();
    redis.strings.set(key, JSON.stringify(stored));
  };

  describe('createInvitation', () => {
    it('returns a base64url token', async () => {
      const token = await service.createInvitation(invitation());

      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThan(32);
    });

    it('issues a different token each time', async () => {
      const first = await service.createInvitation(invitation());
      const second = await service.createInvitation(invitation());

      expect(first).not.toBe(second);
    });

    it('stores the payload under a namespaced key', async () => {
      const token = await service.createInvitation(invitation());

      expect(redis.strings.has(`employee_invitation:${token}`)).toBe(true);
    });

    it('sets a seven-day TTL', async () => {
      const token = await service.createInvitation(invitation());

      expect(redis.ttls.get(`employee_invitation:${token}`)).toBe(
        SEVEN_DAYS_SECONDS,
      );
    });

    it('registers the token in the index', async () => {
      const token = await service.createInvitation(invitation());

      expect([...redis.sets.get(INDEX_KEY)!]).toEqual([token]);
    });

    it('stamps createdAt and expiresAt seven days apart', async () => {
      const token = await service.createInvitation(invitation());

      const stored = await service.getInvitation(token);
      expect(
        stored!.expiresAt.getTime() - stored!.createdAt.getTime(),
      ).toBe(SEVEN_DAYS_SECONDS * 1000);
    });
  });

  describe('getInvitation', () => {
    it('round-trips the payload', async () => {
      const token = await service.createInvitation(
        invitation({ employeeId: 'EMP-3' }),
      );

      const stored = await service.getInvitation(token);

      expect(stored).toMatchObject({
        fullName: 'New Hire',
        email: 'hire@example.com',
        employeeId: 'EMP-3',
        supervisorId: SUPERVISOR_ID,
        status: InvitationStatus.PENDING_APPROVAL,
        requestedBy: REQUESTER,
      });
    });

    it('rehydrates the dates as Date objects, not strings', async () => {
      const token = await service.createInvitation(invitation());

      const stored = await service.getInvitation(token);

      expect(stored!.createdAt).toBeInstanceOf(Date);
      expect(stored!.expiresAt).toBeInstanceOf(Date);
    });

    it('returns null for an unknown token', async () => {
      await expect(service.getInvitation('nonsense')).resolves.toBeNull();
    });

    it('returns null rather than throwing on corrupt json', async () => {
      const token = await service.createInvitation(invitation());
      redis.strings.set(`employee_invitation:${token}`, '{not json');

      await expect(service.getInvitation(token)).resolves.toBeNull();
    });

    describe('expiry', () => {
      it('treats an expired invitation as absent', async () => {
        const token = await service.createInvitation(invitation());
        expireStored(token, new Date(Date.now() - 1000));

        await expect(service.getInvitation(token)).resolves.toBeNull();
      });

      /** Reading an expired invitation also cleans it up, key and index alike. */
      it('deletes the expired record on read', async () => {
        const token = await service.createInvitation(invitation());
        expireStored(token, new Date(Date.now() - 1000));

        await service.getInvitation(token);

        expect(redis.strings.has(`employee_invitation:${token}`)).toBe(false);
        expect([...redis.sets.get(INDEX_KEY)!]).toEqual([]);
      });
    });
  });

  describe('isInvitationValid', () => {
    it('is true for a live invitation', async () => {
      const token = await service.createInvitation(invitation());

      await expect(service.isInvitationValid(token)).resolves.toBe(true);
    });

    it('is false for an unknown token', async () => {
      await expect(service.isInvitationValid('nonsense')).resolves.toBe(false);
    });

    it('is false once expired', async () => {
      const token = await service.createInvitation(invitation());
      expireStored(token, new Date(Date.now() - 1000));

      await expect(service.isInvitationValid(token)).resolves.toBe(false);
    });
  });

  describe('deleteInvitation', () => {
    it('removes both the record and its index entry', async () => {
      const token = await service.createInvitation(invitation());

      await service.deleteInvitation(token);

      expect(redis.strings.size).toBe(0);
      expect([...redis.sets.get(INDEX_KEY)!]).toEqual([]);
    });

    it('is harmless for a token that was never issued', async () => {
      await expect(service.deleteInvitation('nonsense')).resolves.toBeUndefined();
    });
  });

  describe('approve / reject', () => {
    it('marks an invitation approved and records who did it', async () => {
      const token = await service.createInvitation(invitation());

      await service.approveInvitation(token, APPROVER);

      const stored = await service.getInvitation(token);
      expect(stored).toMatchObject({
        status: InvitationStatus.APPROVED,
        approvedBy: APPROVER,
      });
      expect(stored!.approvedAt).toBeDefined();
    });

    /**
     * Rejection reuses the `approvedBy` / `approvedAt` fields — there is no separate
     * rejectedBy. So "who rejected this" is only distinguishable via `status`.
     */
    it('records a rejection under approvedBy as well', async () => {
      const token = await service.createInvitation(invitation());

      await service.rejectInvitation(token, APPROVER);

      const stored = await service.getInvitation(token);
      expect(stored).toMatchObject({
        status: InvitationStatus.REJECTED,
        approvedBy: APPROVER,
      });
    });

    it.each([
      ['approve', (t: string) => service.approveInvitation(t, APPROVER)],
      ['reject', (t: string) => service.rejectInvitation(t, APPROVER)],
    ])('%s throws for an unknown token', async (_label, act) => {
      await expect(act('nonsense')).rejects.toThrow('Invitation not found');
    });

    it.each([
      ['approve', (t: string) => service.approveInvitation(t, APPROVER)],
      ['reject', (t: string) => service.rejectInvitation(t, APPROVER)],
    ])('%s throws once the invitation has expired', async (_label, act) => {
      const token = await service.createInvitation(invitation());
      expireStored(token, new Date(Date.now() - 1000));

      await expect(act(token)).rejects.toThrow('Invitation not found');
    });

    /**
     * The rewrite passes a fresh seven-day TTL, so approving resets the Redis lifetime —
     * but the payload's own `expiresAt` is left untouched, and that is what governs
     * `getInvitation`. The record therefore still expires on the original schedule.
     */
    it('does not move the recorded expiry when approving', async () => {
      const token = await service.createInvitation(invitation());
      const before = (await service.getInvitation(token))!.expiresAt;

      await service.approveInvitation(token, APPROVER);

      expect((await service.getInvitation(token))!.expiresAt).toEqual(before);
    });
  });

  describe('listing', () => {
    it('returns an empty token list before anything is created', async () => {
      await expect(service.getAllInvitationTokens()).resolves.toEqual([]);
    });

    it('lists every issued token', async () => {
      const first = await service.createInvitation(invitation());
      const second = await service.createInvitation(invitation());

      await expect(service.getAllInvitationTokens()).resolves.toEqual(
        expect.arrayContaining([first, second]),
      );
    });

    it('returns every invitation when no status filter is given', async () => {
      await service.createInvitation(invitation());
      await service.createInvitation(invitation());

      await expect(service.getAllInvitationsByStatus()).resolves.toHaveLength(2);
    });

    it('filters by status', async () => {
      const approved = await service.createInvitation(invitation());
      await service.createInvitation(invitation());
      await service.approveInvitation(approved, APPROVER);

      const result = await service.getAllInvitationsByStatus(
        InvitationStatus.APPROVED,
      );

      expect(result).toHaveLength(1);
      expect(result[0].token).toBe(approved);
    });

    it('skips expired invitations when listing', async () => {
      const live = await service.createInvitation(invitation());
      const stale = await service.createInvitation(invitation());
      expireStored(stale, new Date(Date.now() - 1000));

      const result = await service.getAllInvitationsByStatus();

      expect(result.map((r) => r.token)).toEqual([live]);
    });

    describe('getInvitationsByRequestedBy', () => {
      it('returns only the given requester’s invitations', async () => {
        const mine = await service.createInvitation(invitation());
        await service.createInvitation(
          invitation({ requestedBy: OTHER_REQUESTER }),
        );

        const result = await service.getInvitationsByRequestedBy(REQUESTER);

        expect(result.map((r) => r.token)).toEqual([mine]);
      });

      it('combines requester and status filters', async () => {
        const approved = await service.createInvitation(invitation());
        await service.createInvitation(invitation());
        await service.approveInvitation(approved, APPROVER);

        const result = await service.getInvitationsByRequestedBy(
          REQUESTER,
          InvitationStatus.APPROVED,
        );

        expect(result.map((r) => r.token)).toEqual([approved]);
      });

      it('returns empty for a requester with nothing', async () => {
        await service.createInvitation(invitation());

        await expect(
          service.getInvitationsByRequestedBy(OTHER_REQUESTER),
        ).resolves.toEqual([]);
      });
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('reports zero when everything is live', async () => {
      await service.createInvitation(invitation());

      await expect(service.cleanupExpiredInvitations()).resolves.toBe(0);
    });

    it('removes index entries whose record is gone', async () => {
      const token = await service.createInvitation(invitation());
      // Drop the record but leave the index pointing at it, as a TTL lapse would.
      redis.strings.delete(`employee_invitation:${token}`);

      await expect(service.cleanupExpiredInvitations()).resolves.toBe(1);
      expect([...redis.sets.get(INDEX_KEY)!]).toEqual([]);
    });

    /**
     * An expired record is already deleted by `getInvitation` during the sweep, so it is
     * counted through the orphan branch rather than the explicit expiry branch below it —
     * that second branch is unreachable.
     */
    it('counts an expired invitation once and clears it', async () => {
      const token = await service.createInvitation(invitation());
      expireStored(token, new Date(Date.now() - 1000));

      await expect(service.cleanupExpiredInvitations()).resolves.toBe(1);
      expect(redis.strings.size).toBe(0);
      expect([...redis.sets.get(INDEX_KEY)!]).toEqual([]);
    });

    it('leaves live invitations alone while clearing stale ones', async () => {
      const live = await service.createInvitation(invitation());
      const stale = await service.createInvitation(invitation());
      expireStored(stale, new Date(Date.now() - 1000));

      await expect(service.cleanupExpiredInvitations()).resolves.toBe(1);
      await expect(service.getAllInvitationTokens()).resolves.toEqual([live]);
    });
  });
});

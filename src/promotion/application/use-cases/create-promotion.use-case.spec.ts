import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import { FilesService } from 'src/files/domain/services/files.service';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { FakePromotionRepository } from '../../__fixtures__/fake-promotion.repository';
import { AudienceType } from '../../domain/entities/promotion.entity';
import { PromotionCreatedEvent } from '../../domain/events/promotion-created.event';
import { CreatePromotionUseCase } from './create-promotion.use-case';

const USER_ID = '018f4a1e-1c7a-7000-8000-0000000000e1';
const ADMIN_ID = '018f4a1e-1c7a-7000-8000-0000000000e2';
const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-0000000000e3';
const ATTACHMENT_ID = '018f4a1e-1c7a-7000-8000-0000000000e4';

const buildUser = (role: Roles) =>
  User.create(
    {
      id: USER_ID,
      name: 'Dana',
      username: 'dana',
      email: 'dana@example.com',
      password: 'already-a-hash',
      role,
    },
    false,
  );

interface Options {
  creator?: User | null;
  admin?: Admin | null;
  supervisor?: Supervisor | null;
  cloneFails?: boolean;
}

function build(options: Options = {}) {
  const promotions = new FakePromotionRepository();

  const uploadKeyCalls: Array<{ targetId: string; userId?: string }> = [];
  const fileHubCalls: Array<{ targetId?: string; userId?: string; expiresInMs: number }> = [];
  const clones: Array<{ attachmentIds: string[]; targetId: string }> = [];
  const events: PromotionCreatedEvent[] = [];

  const users = stubRepository<UserRepository>('UserRepository', {
    findById: async () =>
      (options.creator === undefined
        ? await buildUser(Roles.ADMIN)
        : options.creator) as User,
  });

  // `?? default` would swallow an explicit null, which is exactly the case these
  // options exist to set up — a user whose role promises a creator row that is missing.
  const admins = stubRepository<AdminRepository>('AdminRepository', {
    findByUserId: async () =>
      options.admin === undefined
        ? Admin.create({ id: ADMIN_ID, userId: USER_ID })
        : options.admin,
  });

  const supervisors = stubRepository<SupervisorRepository>(
    'SupervisorRepository',
    {
      findByUserId: async () =>
        options.supervisor === undefined
          ? Supervisor.create({
              id: SUPERVISOR_ID,
              userId: USER_ID,
              permissions: [],
            })
          : options.supervisor,
    },
  );

  const files = stubRepository<FilesService>('FilesService', {
    genUploadKey: async (targetId: string, userId?: string) => {
      uploadKeyCalls.push({ targetId, userId });
      return `legacy-key-for-${targetId}`;
    },
  });

  const fileHub = stubRepository<FileHubService>('FileHubService', {
    generateUploadToken: async ({ targetId, userId, expiresInMs }) => {
      fileHubCalls.push({ targetId, userId, expiresInMs });
      return {
        uploadKey: `filehub-key-for-${targetId}`,
        uploadExpiry: new Date('2026-08-17T10:00:00.000Z'),
      };
    },
  });

  const cloneAttachments = stubRepository<CloneAttachmentUseCase>(
    'CloneAttachmentUseCase',
    {
      execute: async ({ attachmentIds, targetId }) => {
        clones.push({ attachmentIds, targetId });
        if (options.cloneFails) throw new Error('attachment not found');
        return [];
      },
    },
  );

  // A real emitter, so the event name the use-case publishes under is the one a
  // subscriber would have to bind to.
  const emitter = new EventEmitter2();
  emitter.on(PromotionCreatedEvent.name, (event: PromotionCreatedEvent) => {
    events.push(event);
  });

  return {
    promotions,
    emitter,
    events,
    uploadKeyCalls,
    fileHubCalls,
    clones,
    service: new CreatePromotionUseCase(
      promotions,
      users,
      admins,
      supervisors,
      files,
      emitter,
      cloneAttachments,
      fileHub,
    ),
  };
}

describe('CreatePromotionUseCase', () => {
  it('refuses an unknown creator', async () => {
    const { service } = build({ creator: null });

    await expect(
      service.execute({ title: 'Summer sale', createdByUserId: USER_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('saves the promotion and returns it serialised', async () => {
    const { service, promotions } = build();

    const { promotion } = await service.execute({
      title: 'Summer sale',
      createdByUserId: USER_ID,
    });

    expect(promotion.title).toBe('Summer sale');
    expect(promotions.size).toBe(1);
  });

  it('starts a promotion active', async () => {
    const { service } = build();

    const { promotion } = await service.execute({
      title: 'Summer sale',
      createdByUserId: USER_ID,
    });

    expect(promotion.isActive).toBe(true);
  });

  it('keeps the supplied schedule', async () => {
    const { service } = build();
    const startDate = new Date('2026-09-01T00:00:00.000Z');
    const endDate = new Date('2026-09-30T00:00:00.000Z');

    const { promotion } = await service.execute({
      title: 'Summer sale',
      createdByUserId: USER_ID,
      startDate,
      endDate,
    });

    expect(promotion.startDate).toEqual(startDate);
    expect(promotion.endDate).toEqual(endDate);
  });

  describe('audience', () => {
    it('keeps the requested audience', async () => {
      const { service } = build();

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
        audience: AudienceType.CUSTOMER,
      });

      expect(promotion.audience).toBe(AudienceType.CUSTOMER);
    });

    it('defaults to ALL', async () => {
      const { service } = build();

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
      });

      expect(promotion.audience).toBe(AudienceType.ALL);
    });

    /**
     * The parameter is still typed `any`, so the DTO is not the only line of defence —
     * the entity rejects it. Previously an arbitrary string reached the repository,
     * where `AUDIENCE_TO_DB` yields undefined against a not-null enum column.
     */
    it('rejects an audience outside the enum', async () => {
      const { service } = build();

      await expect(
        service.execute({
          title: 'Summer sale',
          createdByUserId: USER_ID,
          audience: 'MARKETING_TEAM',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('saves nothing when the audience is rejected', async () => {
      const { service, promotions, events } = build();

      await expect(
        service.execute({
          title: 'Summer sale',
          createdByUserId: USER_ID,
          audience: 'MARKETING_TEAM',
        }),
      ).rejects.toThrow();

      expect(promotions.size).toBe(0);
      expect(events).toEqual([]);
    });
  });

  describe('attributing the creator', () => {
    it('records an admin creator', async () => {
      const { service, promotions } = build({
        creator: await buildUser(Roles.ADMIN),
      });

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
      });

      expect(promotion.createdByAdmin?.id.value).toBe(ADMIN_ID);
      expect(promotion.createdBySupervisor).toBeUndefined();
      expect(promotions.saved[0].createdByAdmin?.id.value).toBe(ADMIN_ID);
    });

    it('records a supervisor creator', async () => {
      const { service } = build({ creator: await buildUser(Roles.SUPERVISOR) });

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
      });

      expect(promotion.createdBySupervisor?.id.value).toBe(SUPERVISOR_ID);
      expect(promotion.createdByAdmin).toBeUndefined();
    });

    /**
     * Only ADMIN and SUPERVISOR map to a creator row. Any other role produces a
     * promotion attributed to nobody — the columns are nullable, so it saves cleanly and
     * the admin list shows a promotion with no author. The permission decorator on the
     * controller is the only thing keeping those roles out.
     */
    it.each([Roles.EMPLOYEE, Roles.DRIVER, Roles.GUEST])(
      'attributes a %s promotion to nobody',
      async (role) => {
        const { service } = build({ creator: await buildUser(role) });

        const { promotion } = await service.execute({
          title: 'Summer sale',
          createdByUserId: USER_ID,
        });

        expect(promotion.createdByAdmin).toBeUndefined();
        expect(promotion.createdBySupervisor).toBeUndefined();
      },
    );

    /**
     * A role that promises a creator row but has none is a data fault, not a valid
     * promotion. It used to save unattributed — and with `null` rather than `undefined`,
     * so the creator getter yielded a different flavour of empty depending on which way
     * it got there.
     */
    it('refuses when the admin row is missing', async () => {
      const { service, promotions } = build({
        creator: await buildUser(Roles.ADMIN),
        admin: null,
      });

      await expect(
        service.execute({ title: 'Summer sale', createdByUserId: USER_ID }),
      ).rejects.toThrow(NotFoundException);
      expect(promotions.size).toBe(0);
    });

    it('refuses when the supervisor row is missing', async () => {
      const { service, promotions } = build({
        creator: await buildUser(Roles.SUPERVISOR),
        supervisor: null,
      });

      await expect(
        service.execute({ title: 'Summer sale', createdByUserId: USER_ID }),
      ).rejects.toThrow(NotFoundException);
      expect(promotions.size).toBe(0);
    });

    /** Empty is always `undefined` now, never `null`. */
    it('leaves an unattributed creator undefined rather than null', async () => {
      const { service } = build({ creator: await buildUser(Roles.EMPLOYEE) });

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
      });

      expect(promotion.createdByAdmin).toBeUndefined();
      expect(promotion.createdBySupervisor).toBeUndefined();
    });
  });

  describe('upload keys', () => {
    it('issues no keys unless attach is set', async () => {
      const { service, uploadKeyCalls, fileHubCalls } = build();

      const result = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
      });

      expect(result.uploadKey).toBeUndefined();
      expect(result.fileHubUploadKey).toBeUndefined();
      expect(uploadKeyCalls).toEqual([]);
      expect(fileHubCalls).toEqual([]);
    });

    /**
     * `attach` provisions an upload slot in *both* attachment systems at once — the
     * legacy `FilesService` and FileHub — and hands back both keys. Every attaching
     * create doubles the work and leaves two live credentials for one promotion.
     */
    it('issues keys in both attachment systems when attach is set', async () => {
      const { service, uploadKeyCalls, fileHubCalls } = build();

      const result = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
        attach: true,
      });

      expect(result.uploadKey).toBeDefined();
      expect(result.fileHubUploadKey).toBeDefined();
      expect(uploadKeyCalls).toHaveLength(1);
      expect(fileHubCalls).toHaveLength(1);
    });

    it('scopes both keys to the new promotion and its creator', async () => {
      const { service, uploadKeyCalls, fileHubCalls } = build();

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
        attach: true,
      });

      expect(uploadKeyCalls[0]).toEqual({
        targetId: promotion.id,
        userId: USER_ID,
      });
      expect(fileHubCalls[0]).toEqual({
        targetId: promotion.id,
        userId: USER_ID,
        expiresInMs: 1000 * 60 * 60 * 24,
      });
    });
  });

  describe('cloning chosen attachments', () => {
    it('clones onto the saved promotion', async () => {
      const { service, clones } = build();

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
        chooseAttachments: [ATTACHMENT_ID],
      });

      expect(clones).toEqual([
        { attachmentIds: [ATTACHMENT_ID], targetId: promotion.id },
      ]);
    });

    it('skips cloning for an empty list', async () => {
      const { service, clones } = build();

      await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
        chooseAttachments: [],
      });

      expect(clones).toEqual([]);
    });

    /**
     * Cloning runs after the save and the event, with no rollback. A failure here leaves
     * a promotion created, an activity log written, and the caller holding a 500 — so a
     * retry creates a second promotion.
     */
    it('leaves the promotion created when cloning fails', async () => {
      const { service, promotions, events } = build({ cloneFails: true });

      await expect(
        service.execute({
          title: 'Summer sale',
          createdByUserId: USER_ID,
          chooseAttachments: [ATTACHMENT_ID],
        }),
      ).rejects.toThrow('attachment not found');

      expect(promotions.size).toBe(1);
      expect(events).toHaveLength(1);
    });
  });

  describe('the created event', () => {
    it('publishes the promotion the caller asked for', async () => {
      const { service, events } = build();

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
        audience: AudienceType.CUSTOMER,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        title: 'Summer sale',
        itemId: promotion.id,
        userId: USER_ID,
        audience: AudienceType.CUSTOMER,
      });
    });

    it('publishes under the event class name', async () => {
      const { service, emitter } = build();
      const seen: string[] = [];
      emitter.onAny((name) => seen.push(String(name)));

      await service.execute({ title: 'Summer sale', createdByUserId: USER_ID });

      expect(seen).toEqual(['PromotionCreatedEvent']);
    });

    /**
     * The emit used to sit inside the same `Promise.all` as the save, so a failed save
     * still left a PROMOTION_CREATED entry behind for a promotion nobody could open. It
     * now runs after the save resolves.
     */
    it('publishes nothing when the save fails', async () => {
      const { service, promotions, events } = build();
      jest
        .spyOn(promotions, 'save')
        .mockRejectedValue(new Error('connection terminated'));

      await expect(
        service.execute({ title: 'Summer sale', createdByUserId: USER_ID }),
      ).rejects.toThrow('connection terminated');

      expect(events).toEqual([]);
    });

    it('publishes the saved promotion, not the one built in memory', async () => {
      const { service, events } = build();

      const { promotion } = await service.execute({
        title: 'Summer sale',
        createdByUserId: USER_ID,
      });

      expect(events[0].itemId).toBe(promotion.id);
    });

    /**
     * The audit log is secondary to the create, so a failing subscriber is logged rather
     * than surfaced — otherwise a broken log store returns a 500 for a promotion that
     * was created perfectly well, and the client retries into a duplicate.
     */
    it('survives a subscriber that throws', async () => {
      const { service, promotions, emitter } = build();
      const logged = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      emitter.on(PromotionCreatedEvent.name, async () => {
        throw new Error('activity log unavailable');
      });

      await expect(
        service.execute({ title: 'Summer sale', createdByUserId: USER_ID }),
      ).resolves.toBeDefined();

      expect(promotions.size).toBe(1);
      expect(logged).toHaveBeenCalled();
    });
  });
});

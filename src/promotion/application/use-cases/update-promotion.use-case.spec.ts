import { BadRequestException, NotFoundException } from '@nestjs/common';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import { DeleteAttachmentsByIdsUseCase } from 'src/files/application/use-cases/delete-attachments-by-ids.use-case';
import { FilesService } from 'src/files/domain/services/files.service';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { FakePromotionRepository } from '../../__fixtures__/fake-promotion.repository';
import { AudienceType, Promotion } from '../../domain/entities/promotion.entity';
import { UpdatePromotionUseCase } from './update-promotion.use-case';

const PROMOTION_ID = '018f4a1e-1c7a-7000-8000-0000000000f1';
const USER_ID = '018f4a1e-1c7a-7000-8000-0000000000e1';
const ATTACHMENT_ID = '018f4a1e-1c7a-7000-8000-0000000000e4';

const buildPromotion = (
  overrides: Partial<Parameters<typeof Promotion.create>[0]> = {},
) =>
  Promotion.create({
    id: PROMOTION_ID,
    title: 'Summer sale',
    audience: AudienceType.ALL,
    isActive: true,
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    endDate: new Date('2026-06-30T00:00:00.000Z'),
    ...overrides,
  });

function build(options: { deleteFails?: boolean } = {}) {
  const promotions = new FakePromotionRepository();

  const uploadKeyCalls: Array<{ targetId: string; userId?: string }> = [];
  const fileHubCalls: Array<{ targetId?: string; userId?: string }> = [];
  const deletions: string[][] = [];
  const clones: Array<{ attachmentIds: string[]; targetId: string }> = [];

  const files = stubRepository<FilesService>('FilesService', {
    genUploadKey: async (targetId: string, userId?: string) => {
      uploadKeyCalls.push({ targetId, userId });
      return `legacy-key-for-${targetId}`;
    },
  });

  const fileHub = stubRepository<FileHubService>('FileHubService', {
    generateUploadToken: async ({ targetId, userId }) => {
      fileHubCalls.push({ targetId, userId });
      return {
        uploadKey: `filehub-key-for-${targetId}`,
        uploadExpiry: new Date('2026-08-17T10:00:00.000Z'),
      };
    },
  });

  const deleteAttachments = stubRepository<DeleteAttachmentsByIdsUseCase>(
    'DeleteAttachmentsByIdsUseCase',
    {
      execute: async ({ attachmentIds }) => {
        deletions.push(attachmentIds);
        if (options.deleteFails) throw new Error('attachment store unreachable');
        return { deletedCount: attachmentIds.length, failedDeletions: [] };
      },
    },
  );

  const cloneAttachments = stubRepository<CloneAttachmentUseCase>(
    'CloneAttachmentUseCase',
    {
      execute: async ({ attachmentIds, targetId }) => {
        clones.push({ attachmentIds, targetId });
        return [];
      },
    },
  );

  return {
    promotions,
    uploadKeyCalls,
    fileHubCalls,
    deletions,
    clones,
    service: new UpdatePromotionUseCase(
      promotions,
      files,
      deleteAttachments,
      cloneAttachments,
      fileHub,
    ),
  };
}

describe('UpdatePromotionUseCase', () => {
  it('refuses an unknown promotion', async () => {
    const { service } = build();

    await expect(service.execute(PROMOTION_ID, { title: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('applying the patch', () => {
    it('updates every supplied field', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion());
      const startDate = new Date('2026-09-01T00:00:00.000Z');
      const endDate = new Date('2026-09-30T00:00:00.000Z');

      const { promotion } = await service.execute(PROMOTION_ID, {
        title: 'Winter sale',
        audience: AudienceType.EMPLOYEE,
        isActive: false,
        startDate,
        endDate,
      });

      expect(promotion.title).toBe('Winter sale');
      expect(promotion.audience).toBe(AudienceType.EMPLOYEE);
      expect(promotion.isActive).toBe(false);
      expect(promotion.startDate).toEqual(startDate);
      expect(promotion.endDate).toEqual(endDate);
    });

    it('leaves omitted fields alone', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion());

      const { promotion } = await service.execute(PROMOTION_ID, {
        title: 'Winter sale',
      });

      expect(promotion.audience).toBe(AudienceType.ALL);
      expect(promotion.isActive).toBe(true);
      expect(promotion.endDate).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    });

    /** `undefined` means "not supplied"; `null` is the way to clear an end date. */
    it('clears the end date when given null', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion());

      const { promotion } = await service.execute(PROMOTION_ID, {
        endDate: null,
      });

      expect(promotion.endDate).toBeUndefined();
    });

    it('keeps the end date when it is omitted entirely', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion());

      const { promotion } = await service.execute(PROMOTION_ID, { title: 'x' });

      expect(promotion.endDate).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    });

    it('can deactivate a promotion', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion({ isActive: true }));

      await service.execute(PROMOTION_ID, { isActive: false });

      expect(promotions.stateOf(PROMOTION_ID)?.isActive).toBe(false);
    });

    it('never changes the created timestamp', async () => {
      const { service, promotions } = build();
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      promotions.seed(buildPromotion({ createdAt }));

      const { promotion } = await service.execute(PROMOTION_ID, {
        title: 'Winter sale',
      });

      expect(promotion.createdAt).toEqual(createdAt);
    });

    /**
     * `audience` is `any` here too. The entity rejects it on the way in, so an
     * unrecognised value no longer reaches the repository's enum mapping.
     *
     * Note where it throws: the patch is applied to the loaded entity, and the entity
     * setter has no check — it is the *save* path that never runs. The in-memory object
     * is discarded either way, so nothing is persisted.
     */
    it('rejects an audience outside the enum', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion());

      await expect(
        service.execute(PROMOTION_ID, { audience: 'MARKETING_TEAM' }),
      ).rejects.toThrow();

      expect(promotions.stateOf(PROMOTION_ID)?.audience).toBe(AudienceType.ALL);
    });

    /**
     * A patch could previously invert an otherwise healthy window, leaving the promotion
     * looking live in the admin list while the schedule predicate excluded it from every
     * audience query.
     */
    it('rejects a start date after the end date', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion());

      await expect(
        service.execute(PROMOTION_ID, {
          startDate: new Date('2026-12-01T00:00:00.000Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists nothing when the window is rejected', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion());

      await expect(
        service.execute(PROMOTION_ID, {
          title: 'Winter sale',
          startDate: new Date('2026-12-01T00:00:00.000Z'),
        }),
      ).rejects.toThrow();

      expect(promotions.stateOf(PROMOTION_ID)?.title).toBe('Summer sale');
    });

    /** Clearing the end date cannot invert a window, so it stays allowed. */
    it('accepts a start date moved past a cleared end date', async () => {
      const { service, promotions } = build();
      promotions.seed(buildPromotion());

      const { promotion } = await service.execute(PROMOTION_ID, {
        startDate: new Date('2026-12-01T00:00:00.000Z'),
        endDate: null,
      });

      expect(promotion.endDate).toBeUndefined();
      expect(promotion.startDate).toEqual(new Date('2026-12-01T00:00:00.000Z'));
    });
  });

  describe('upload keys', () => {
    it('issues none unless attach is set', async () => {
      const { service, promotions, uploadKeyCalls, fileHubCalls } = build();
      promotions.seed(buildPromotion());

      const result = await service.execute(PROMOTION_ID, { title: 'x' }, USER_ID);

      expect(result.uploadKey).toBeUndefined();
      expect(result.fileHubUploadKey).toBeUndefined();
      expect(uploadKeyCalls).toEqual([]);
      expect(fileHubCalls).toEqual([]);
    });

    it('issues keys in both attachment systems when attach is set', async () => {
      const { service, promotions, uploadKeyCalls, fileHubCalls } = build();
      promotions.seed(buildPromotion());

      const result = await service.execute(
        PROMOTION_ID,
        { attach: true },
        USER_ID,
      );

      expect(result.uploadKey).toBe(`legacy-key-for-${PROMOTION_ID}`);
      expect(result.fileHubUploadKey).toBe(`filehub-key-for-${PROMOTION_ID}`);
      expect(uploadKeyCalls[0]).toEqual({
        targetId: PROMOTION_ID,
        userId: USER_ID,
      });
      expect(fileHubCalls[0]).toEqual({
        targetId: PROMOTION_ID,
        userId: USER_ID,
      });
    });

    /**
     * `userId` is an optional third argument the controller happens to pass. Called
     * without it, the keys are still issued — attributed to nobody.
     */
    it('issues keys without a user when none is supplied', async () => {
      const { service, promotions, uploadKeyCalls } = build();
      promotions.seed(buildPromotion());

      await service.execute(PROMOTION_ID, { attach: true });

      expect(uploadKeyCalls[0]).toEqual({
        targetId: PROMOTION_ID,
        userId: undefined,
      });
    });
  });

  describe('attachments', () => {
    it('deletes the attachments it was asked to', async () => {
      const { service, promotions, deletions } = build();
      promotions.seed(buildPromotion());

      await service.execute(PROMOTION_ID, {
        deleteAttachments: [ATTACHMENT_ID],
      });

      expect(deletions).toEqual([[ATTACHMENT_ID]]);
    });

    it('skips the deletion call for an empty list', async () => {
      const { service, promotions, deletions } = build();
      promotions.seed(buildPromotion());

      await service.execute(PROMOTION_ID, { deleteAttachments: [] });

      expect(deletions).toEqual([]);
    });

    it('clones the attachments it was asked to', async () => {
      const { service, promotions, clones } = build();
      promotions.seed(buildPromotion());

      await service.execute(PROMOTION_ID, {
        chooseAttachments: [ATTACHMENT_ID],
      });

      expect(clones).toEqual([
        { attachmentIds: [ATTACHMENT_ID], targetId: PROMOTION_ID },
      ]);
    });

    /**
     * The deletion now runs after the save. Previously a patch that failed validation
     * or hit a database error had already destroyed the attachments, with no transaction
     * and no compensating restore.
     */
    it('keeps the attachments when the save fails', async () => {
      const { service, promotions, deletions } = build();
      promotions.seed(buildPromotion());
      jest
        .spyOn(promotions, 'save')
        .mockRejectedValue(new Error('connection terminated'));

      await expect(
        service.execute(PROMOTION_ID, {
          title: 'Winter sale',
          deleteAttachments: [ATTACHMENT_ID],
        }),
      ).rejects.toThrow('connection terminated');

      expect(deletions).toEqual([]);
    });

    it('keeps the attachments when the patch is rejected', async () => {
      const { service, promotions, deletions } = build();
      promotions.seed(buildPromotion());

      await expect(
        service.execute(PROMOTION_ID, {
          audience: 'MARKETING_TEAM',
          deleteAttachments: [ATTACHMENT_ID],
        }),
      ).rejects.toThrow();

      expect(deletions).toEqual([]);
    });

    /**
     * The trade is that the ordering reverses which half survives a partial failure: the
     * patch is committed before the attachments are touched, so a failing deletion now
     * leaves an updated promotion still holding attachments it asked to drop. That is
     * recoverable by retrying the delete; the previous order was not.
     */
    it('keeps the saved patch when the attachment deletion fails', async () => {
      const { service, promotions } = build({ deleteFails: true });
      promotions.seed(buildPromotion());

      await expect(
        service.execute(PROMOTION_ID, {
          title: 'Winter sale',
          deleteAttachments: [ATTACHMENT_ID],
        }),
      ).rejects.toThrow('attachment store unreachable');

      expect(promotions.stateOf(PROMOTION_ID)?.title).toBe('Winter sale');
    });
  });
});

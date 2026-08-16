import { NotFoundException } from '@nestjs/common';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';
import { FilesService } from 'src/files/domain/services/files.service';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { FakePromotionRepository } from '../../__fixtures__/fake-promotion.repository';
import { AudienceType, Promotion } from '../../domain/entities/promotion.entity';
import { DeletePromotionUseCase } from './delete-promotion.use-case';
import { GetAllPromotionsUseCase } from './get-all-promotions.use-case';
import { GetPromotionUseCase } from './get-promotion.use-case';
import { TogglePromotionActiveUseCase } from './toggle-promotion-active.use-case';

const PROMOTION_ID = '018f4a1e-1c7a-7000-8000-0000000000f1';
const OTHER_PROMOTION_ID = '018f4a1e-1c7a-7000-8000-0000000000f2';

const buildPromotion = (overrides: Partial<Parameters<typeof Promotion.create>[0]> = {}) =>
  Promotion.create({
    id: PROMOTION_ID,
    title: 'Summer sale',
    audience: AudienceType.ALL,
    isActive: true,
    ...overrides,
  });

function build() {
  const promotions = new FakePromotionRepository();

  const attachmentQueries: Array<string[]> = [];
  const signedUrlQueries: Array<string[]> = [];
  const deletedTargets: string[] = [];

  const attachmentIds = stubRepository<GetAttachmentIdsByTargetIdsUseCase>(
    'GetAttachmentIdsByTargetIdsUseCase',
    {
      execute: async ({ targetIds }) => {
        attachmentQueries.push(targetIds);
        return Object.fromEntries(
          targetIds.map((id) => [id, [`attachment-of-${id}`]]),
        );
      },
    },
  );

  const signedUrls = stubRepository<GetTargetAttachmentsWithSignedUrlsUseCase>(
    'GetTargetAttachmentsWithSignedUrlsUseCase',
    {
      execute: async ({ targetIds }) => {
        signedUrlQueries.push(targetIds);
        return [] as FilehubAttachmentMessage[];
      },
    },
  );

  const files = stubRepository<FilesService>('FilesService', {
    deleteFilesByTargetId: async (targetId: string) => {
      deletedTargets.push(targetId);
    },
  });

  return {
    promotions,
    files,
    attachmentQueries,
    signedUrlQueries,
    deletedTargets,
    get: new GetPromotionUseCase(promotions, attachmentIds),
    getAll: new GetAllPromotionsUseCase(promotions, attachmentIds, signedUrls),
    toggle: new TogglePromotionActiveUseCase(promotions),
    remove: new DeletePromotionUseCase(promotions, files),
  };
}

describe('promotion crud', () => {
  describe('GetPromotionUseCase', () => {
    it('returns the promotion with its attachment ids', async () => {
      const { get, promotions } = build();
      promotions.seed(buildPromotion());

      const result = await get.execute(PROMOTION_ID);

      expect(result.promotion.id.value).toBe(PROMOTION_ID);
      expect(result.attachments).toEqual({
        [PROMOTION_ID]: [`attachment-of-${PROMOTION_ID}`],
      });
    });

    it('refuses an unknown promotion', async () => {
      const { get } = build();

      await expect(get.execute(PROMOTION_ID)).rejects.toThrow(NotFoundException);
    });

    it('does not query attachments for a promotion that does not exist', async () => {
      const { get, attachmentQueries } = build();

      await expect(get.execute(PROMOTION_ID)).rejects.toThrow();

      expect(attachmentQueries).toEqual([]);
    });
  });

  describe('GetAllPromotionsUseCase', () => {
    it('returns every promotion newest first', async () => {
      const { getAll, promotions } = build();
      promotions.seed(
        buildPromotion({
          id: PROMOTION_ID,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
        buildPromotion({
          id: OTHER_PROMOTION_ID,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
        }),
      );

      const { promotions: found } = await getAll.execute();

      expect(found.map((promotion) => promotion.id.value)).toEqual([
        OTHER_PROMOTION_ID,
        PROMOTION_ID,
      ]);
    });

    it('asks both attachment systems for the same targets', async () => {
      const { getAll, promotions, attachmentQueries, signedUrlQueries } = build();
      promotions.seed(buildPromotion());

      await getAll.execute();

      expect(attachmentQueries).toEqual([[PROMOTION_ID]]);
      expect(signedUrlQueries).toEqual([[PROMOTION_ID]]);
    });

    it('still queries with an empty target list when there are no promotions', async () => {
      const { getAll, attachmentQueries } = build();

      const result = await getAll.execute();

      expect(result.promotions).toEqual([]);
      expect(attachmentQueries).toEqual([[]]);
    });

    it('passes pagination through to the repository', async () => {
      const { getAll, promotions } = build();
      promotions.seed(
        buildPromotion({
          id: PROMOTION_ID,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
        buildPromotion({
          id: OTHER_PROMOTION_ID,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
        }),
      );

      const { promotions: found } = await getAll.execute(1, 1);

      expect(promotions.received.findAll).toEqual([{ offset: 1, limit: 1 }]);
      expect(found.map((promotion) => promotion.id.value)).toEqual([PROMOTION_ID]);
    });

    /**
     * `PromotionController.getAll` calls `execute()` with no arguments, so both bounds
     * reach the repository as undefined and every row is loaded. The repository supports
     * pagination; nothing above it uses it.
     */
    it('loads everything when called the way the controller calls it', async () => {
      const { getAll, promotions } = build();

      await getAll.execute();

      expect(promotions.received.findAll).toEqual([
        { offset: undefined, limit: undefined },
      ]);
    });
  });

  describe('TogglePromotionActiveUseCase', () => {
    it('deactivates an active promotion', async () => {
      const { toggle, promotions } = build();
      promotions.seed(buildPromotion({ isActive: true }));

      const result = await toggle.execute(PROMOTION_ID);

      expect(result.isActive).toBe(false);
      expect(promotions.stateOf(PROMOTION_ID)?.isActive).toBe(false);
    });

    it('reactivates an inactive promotion', async () => {
      const { toggle, promotions } = build();
      promotions.seed(buildPromotion({ isActive: false }));

      const result = await toggle.execute(PROMOTION_ID);

      expect(result.isActive).toBe(true);
    });

    it('refuses an unknown promotion', async () => {
      const { toggle } = build();

      await expect(toggle.execute(PROMOTION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('changes nothing else', async () => {
      const { toggle, promotions } = build();
      promotions.seed(
        buildPromotion({ title: 'Summer sale', audience: AudienceType.CUSTOMER }),
      );

      const result = await toggle.execute(PROMOTION_ID);

      expect(result.title).toBe('Summer sale');
      expect(result.audience).toBe(AudienceType.CUSTOMER);
    });

    /**
     * The flip happens inside the statement (`SET is_active = NOT is_active`), so two
     * overlapping toggles serialise into two flips and land back where they started.
     * The previous read-flip-write pair had both callers read the same value and write
     * the same result, collapsing the round trip into one.
     */
    it('applies both of two concurrent toggles', async () => {
      const { toggle, promotions } = build();
      promotions.seed(buildPromotion({ isActive: true }));

      await Promise.all([toggle.execute(PROMOTION_ID), toggle.execute(PROMOTION_ID)]);

      expect(promotions.stateOf(PROMOTION_ID)?.isActive).toBe(true);
    });

    it('lands on the opposite state after an odd number of toggles', async () => {
      const { toggle, promotions } = build();
      promotions.seed(buildPromotion({ isActive: true }));

      await Promise.all([
        toggle.execute(PROMOTION_ID),
        toggle.execute(PROMOTION_ID),
        toggle.execute(PROMOTION_ID),
      ]);

      expect(promotions.stateOf(PROMOTION_ID)?.isActive).toBe(false);
    });
  });

  describe('DeletePromotionUseCase', () => {
    it('removes the promotion', async () => {
      const { remove, promotions } = build();
      promotions.seed(buildPromotion());

      await expect(remove.execute(PROMOTION_ID)).resolves.toEqual({
        success: true,
      });
      expect(promotions.size).toBe(0);
    });

    it('deletes the attached files', async () => {
      const { remove, promotions, deletedTargets } = build();
      promotions.seed(buildPromotion());

      await remove.execute(PROMOTION_ID);

      expect(deletedTargets).toEqual([PROMOTION_ID]);
    });

    it('refuses an unknown promotion', async () => {
      const { remove } = build();

      await expect(remove.execute(PROMOTION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    /**
     * `targetId` is not namespaced by entity type, so any id in the system reaches
     * `deleteFilesByTargetId`. The existence check now runs first, which is the only
     * thing keeping an arbitrary id away from that destructive call.
     */
    it('touches no files for an id that is not a promotion', async () => {
      const { remove, deletedTargets } = build();

      await expect(remove.execute(PROMOTION_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(deletedTargets).toEqual([]);
    });

    it('deletes the row before the files', async () => {
      const { remove, promotions, files } = build();
      promotions.seed(buildPromotion());
      let rowsWhenFilesDeleted = -1;
      jest
        .spyOn(files, 'deleteFilesByTargetId')
        .mockImplementation(async () => {
          rowsWhenFilesDeleted = promotions.size;
        });

      await remove.execute(PROMOTION_ID);

      expect(rowsWhenFilesDeleted).toBe(0);
    });

    /** A failed row delete leaves the files alone — nothing destructive has run yet. */
    it('keeps both the promotion and its files when the row delete fails', async () => {
      const { remove, promotions, deletedTargets } = build();
      promotions.seed(buildPromotion());
      jest
        .spyOn(promotions, 'removeById')
        .mockRejectedValue(new Error('connection terminated'));

      await expect(remove.execute(PROMOTION_ID)).rejects.toThrow(
        'connection terminated',
      );

      expect(deletedTargets).toEqual([]);
      expect(promotions.size).toBe(1);
    });

    /**
     * Still not atomic — but the surviving failure mode is now orphaned bytes rather
     * than a promotion pointing at attachments that no longer exist.
     */
    it('leaves orphaned files when the file delete fails after the row is gone', async () => {
      const { remove, promotions, files } = build();
      promotions.seed(buildPromotion());
      jest
        .spyOn(files, 'deleteFilesByTargetId')
        .mockRejectedValue(new Error('object store unreachable'));

      await expect(remove.execute(PROMOTION_ID)).rejects.toThrow(
        'object store unreachable',
      );

      expect(promotions.size).toBe(0);
    });
  });
});

import { NotFoundException } from '@nestjs/common';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';
import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { FakePromotionRepository } from '../../__fixtures__/fake-promotion.repository';
import { AudienceType, Promotion } from '../../domain/entities/promotion.entity';
import { GetPromotionForCustomerUseCase } from './get-promotion-for-customer.use-case';
import { GetPromotionForUserUseCase } from './get-promotion-for-user.use-case';

const PROMOTION_ID = '018f4a1e-1c7a-7000-8000-0000000000f1';
const USER_ID = '018f4a1e-1c7a-7000-8000-0000000000e1';

const buildPromotion = () =>
  Promotion.create({
    id: PROMOTION_ID,
    title: 'Summer sale',
    audience: AudienceType.ALL,
    isActive: true,
  });

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

function build(options: { user?: User | null } = {}) {
  const promotions = new FakePromotionRepository();
  const attachmentQueries: Array<string[]> = [];

  const users = stubRepository<UserRepository>('UserRepository', {
    findById: async () => options.user as User,
  });

  const attachments = stubRepository<GetAttachmentsByTargetIdsUseCase>(
    'GetAttachmentsByTargetIdsUseCase',
    {
      execute: async ({ targetIds }) => {
        attachmentQueries.push(targetIds);
        return Object.fromEntries(
          targetIds.map((id) => [id, [`token-for-${id}`]]),
        );
      },
    },
  );

  return {
    promotions,
    attachmentQueries,
    forUser: new GetPromotionForUserUseCase(promotions, users, attachments),
    forCustomer: new GetPromotionForCustomerUseCase(promotions, attachments),
  };
}

describe('promotion audience queries', () => {
  describe('GetPromotionForUserUseCase', () => {
    it('refuses an unknown user', async () => {
      const { forUser } = build({ user: null });

      await expect(forUser.execute({ userId: USER_ID })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not query anything for an unknown user', async () => {
      const { forUser, promotions, attachmentQueries } = build({ user: null });

      await expect(forUser.execute({ userId: USER_ID })).rejects.toThrow();

      expect(promotions.received.forUserRole).toBeUndefined();
      expect(attachmentQueries).toEqual([]);
    });

    /** The role is the only thing that selects an audience — the user id is not passed on. */
    it.each([Roles.EMPLOYEE, Roles.SUPERVISOR, Roles.DRIVER, Roles.GUEST, Roles.ADMIN])(
      'selects by the %s role',
      async (role) => {
        const { forUser, promotions } = build({ user: await buildUser(role) });

        await forUser.execute({ userId: USER_ID });

        expect(promotions.received.forUserRole).toBe(role);
      },
    );

    it('returns the promotion with its attachment tokens', async () => {
      const { forUser, promotions } = build({
        user: await buildUser(Roles.EMPLOYEE),
      });
      promotions.promotionForUser = buildPromotion();

      const result = await forUser.execute({ userId: USER_ID });

      expect(result.promotion.id.value).toBe(PROMOTION_ID);
      expect(result.attachments).toEqual({
        [PROMOTION_ID]: [`token-for-${PROMOTION_ID}`],
      });
    });

    /**
     * No promotion is an ordinary outcome — most roles will have none live at any given
     * moment — so this returns null with an empty attachment map rather than throwing.
     */
    it('returns null and an empty attachment map when nothing is live', async () => {
      const { forUser, attachmentQueries } = build({
        user: await buildUser(Roles.EMPLOYEE),
      });

      const result = await forUser.execute({ userId: USER_ID });

      expect(result.promotion).toBeNull();
      expect(result.attachments).toEqual({});
      expect(attachmentQueries).toEqual([[]]);
    });
  });

  describe('GetPromotionForCustomerUseCase', () => {
    it('returns the promotion with its attachment tokens', async () => {
      const { forCustomer, promotions } = build();
      promotions.promotionForCustomer = buildPromotion();

      const result = await forCustomer.execute();

      expect(result.promotion.id.value).toBe(PROMOTION_ID);
      expect(result.attachments).toEqual({
        [PROMOTION_ID]: [`token-for-${PROMOTION_ID}`],
      });
    });

    it('returns null and an empty attachment map when nothing is live', async () => {
      const { forCustomer, attachmentQueries } = build();

      const result = await forCustomer.execute();

      expect(result.promotion).toBeNull();
      expect(result.attachments).toEqual({});
      expect(attachmentQueries).toEqual([[]]);
    });

    /**
     * There is no user, no session and no argument — the customer promotion is the same
     * for everyone, which is why the endpoint can run behind only a guest-id
     * interceptor rather than an auth guard.
     */
    it('takes no caller into account at all', async () => {
      const { forCustomer, promotions } = build();

      await forCustomer.execute();
      await forCustomer.execute();

      expect(promotions.received.forCustomer).toBe(2);
      expect(promotions.received.forUserRole).toBeUndefined();
    });
  });
});

import { Roles } from 'src/shared/value-objects/role.vo';
import { Promotion } from '../entities/promotion.entity';

export abstract class PromotionRepository {
  abstract save(promotion: Promotion): Promise<Promotion>;
  abstract findById(id: string): Promise<Promotion | null>;
  abstract findAll(offset?: number, limit?: number): Promise<Promotion[]>;
  abstract removeById(id: string): Promise<Promotion | null>;
  /**
   * Flips `isActive` in a single statement and returns the new state, or null if the
   * promotion does not exist. A read-flip-write pair loses one of two concurrent
   * toggles; this cannot.
   */
  abstract toggleActive(id: string): Promise<Promotion | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findByAudience(audience: string): Promise<Promotion[]>;
  abstract findActive(): Promise<Promotion[]>;
  abstract findActiveByAudience(audience: string): Promise<Promotion[]>;
  abstract getPromotionForUser(role: Roles): Promise<Promotion | null>;
  abstract getPromotionForCustomer(): Promise<Promotion | null>;
}

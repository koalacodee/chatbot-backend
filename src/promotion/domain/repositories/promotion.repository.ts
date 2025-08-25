import { Roles } from 'src/shared/value-objects/role.vo';
import { Promotion } from '../entities/promotion.entity';

export abstract class PromotionRepository {
  abstract save(promotion: Promotion): Promise<Promotion>;
  abstract findById(id: string): Promise<Promotion | null>;
  abstract findAll(offset?: number, limit?: number): Promise<Promotion[]>;
  abstract removeById(id: string): Promise<Promotion | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findByAudience(audience: string): Promise<Promotion[]>;
  abstract findActive(): Promise<Promotion[]>;
  abstract findActiveByAudience(audience: string): Promise<Promotion[]>;
  abstract getPromotionForUser(role: Roles): Promise<Promotion | null>;
}

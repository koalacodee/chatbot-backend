import { Roles } from 'src/shared/value-objects/role.vo';
import { Promotion } from '../domain/entities/promotion.entity';
import { PromotionRepository } from '../domain/repositories/promotion.repository';

/**
 * A real implementation of the abstract repository, so the compiler checks it against
 * the contract rather than letting the tests assert a stale shape.
 *
 * CRUD is genuinely in-memory. The audience queries are not: `withinSchedule` and the
 * role-to-audience mapping are SQL predicates whose behaviour only a database can
 * settle, and the use-cases above them do nothing but delegate. Faking that logic here
 * would test the fake. Instead those methods return a canned promotion and record the
 * argument they were handed.
 *
 * Reads hand back a rebuilt entity, matching the real repository — every query goes
 * through `toDomain`, so a caller never holds the stored object and mutating a result
 * changes nothing until it is saved back.
 */
export class FakePromotionRepository extends PromotionRepository {
  private readonly stored = new Map<string, Promotion>();

  /** Every entity handed to `save`, in order. */
  readonly saved: Promotion[] = [];

  /** Canned results for the query methods; set these per test. */
  promotionForUser: Promotion | null = null;
  promotionForCustomer: Promotion | null = null;

  /** Arguments the delegating query methods were called with. */
  readonly received: {
    forUserRole?: Roles;
    forCustomer: number;
    findAll: Array<{ offset?: number; limit?: number }>;
  } = { forCustomer: 0, findAll: [] };

  private copy(promotion: Promotion): Promotion {
    return Promotion.create(promotion.toJSON());
  }

  seed(...promotions: Promotion[]): void {
    for (const promotion of promotions) {
      this.stored.set(promotion.id.toString(), promotion);
    }
  }

  /** The stored entity itself, for asserting what a write actually persisted. */
  stateOf(id: string): Promotion | undefined {
    return this.stored.get(id);
  }

  get size(): number {
    return this.stored.size;
  }

  async save(promotion: Promotion): Promise<Promotion> {
    this.saved.push(promotion);

    const existing = this.stored.get(promotion.id.toString());

    // Upsert on id: `createdAt` stays put, everything else is overwritten.
    const persisted = Promotion.create({
      ...promotion.toJSON(),
      createdAt: existing?.createdAt ?? promotion.createdAt,
      updatedAt: new Date(),
    });

    this.stored.set(persisted.id.toString(), persisted);

    return this.copy(persisted);
  }

  async findById(id: string): Promise<Promotion | null> {
    const found = this.stored.get(id);
    return found ? this.copy(found) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<Promotion[]> {
    this.received.findAll.push({ offset, limit });

    const ordered = [...this.stored.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const from = offset ?? 0;
    const to = limit === undefined ? undefined : from + limit;

    return ordered.slice(from, to).map((promotion) => this.copy(promotion));
  }

  async removeById(id: string): Promise<Promotion | null> {
    const existing = this.stored.get(id);
    if (!existing) return null;

    this.stored.delete(id);

    return this.copy(existing);
  }

  /**
   * The real implementation is a single `SET is_active = NOT is_active` statement. The
   * equivalent here is reading and writing without yielding in between, so two
   * concurrent callers cannot interleave the way they could around an `await`.
   */
  async toggleActive(id: string): Promise<Promotion | null> {
    const existing = this.stored.get(id);
    if (!existing) return null;

    const toggled = Promotion.create({
      ...existing.toJSON(),
      isActive: !existing.isActive,
      updatedAt: new Date(),
    });

    this.stored.set(id, toggled);

    return this.copy(toggled);
  }

  async exists(id: string): Promise<boolean> {
    return this.stored.has(id);
  }

  async count(): Promise<number> {
    return this.stored.size;
  }

  async findByAudience(audience: string): Promise<Promotion[]> {
    return [...this.stored.values()]
      .filter((promotion) => promotion.audience === audience.toUpperCase())
      .map((promotion) => this.copy(promotion));
  }

  async findActive(): Promise<Promotion[]> {
    return [...this.stored.values()]
      .filter((promotion) => promotion.isActive)
      .map((promotion) => this.copy(promotion));
  }

  async findActiveByAudience(audience: string): Promise<Promotion[]> {
    return [...this.stored.values()]
      .filter(
        (promotion) =>
          promotion.isActive && promotion.audience === audience.toUpperCase(),
      )
      .map((promotion) => this.copy(promotion));
  }

  async getPromotionForUser(role: Roles): Promise<Promotion | null> {
    this.received.forUserRole = role;
    return this.promotionForUser;
  }

  async getPromotionForCustomer(): Promise<Promotion | null> {
    this.received.forCustomer += 1;
    return this.promotionForCustomer;
  }
}

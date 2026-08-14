import { NotFoundException } from '@nestjs/common';
import { Admin } from '../domain/entities/admin.entity';
import { AdminRepository } from '../domain/repositories/admin.repository';
import { resolveUserId } from '../infrastructure/repositories/drizzle-admin.repository';

/**
 * Fully in-memory — every method on AdminRepository has a meaningful non-SQL
 * implementation, so unlike the activity-log fake nothing here needs canned results.
 *
 * `AdminModule` is `@Global` and this repository is injected by the auth, employee-request,
 * promotion and notification use-cases, so this fixture is meant to be reused by their
 * tests rather than re-stubbed each time.
 */
export class FakeAdminRepository extends AdminRepository {
  readonly admins = new Map<string, Admin>();

  /** Seeds without going through `save`, for arranging a test's starting state. */
  seed(...admins: Admin[]): this {
    for (const admin of admins) this.admins.set(admin.id.value, admin);
    return this;
  }

  async save(admin: Admin): Promise<Admin> {
    this.admins.set(admin.id.value, admin);
    return admin;
  }

  async findById(id: string): Promise<Admin | null> {
    return this.admins.get(id) ?? null;
  }

  async findAll(): Promise<Admin[]> {
    return [...this.admins.values()];
  }

  async removeById(id: string): Promise<Admin | null> {
    const existing = this.admins.get(id) ?? null;
    this.admins.delete(id);
    return existing;
  }

  /** Set semantics, matching `WHERE id IN (...)`: a repeated id yields a single row. */
  async findByIds(ids: string[]): Promise<Admin[]> {
    return [...new Set(ids)]
      .map((id) => this.admins.get(id))
      .filter((admin): admin is Admin => admin !== undefined);
  }

  /** Mirrors the real repository: no userId means "no change", missing row throws. */
  async update(id: string, update: Partial<Admin>): Promise<Admin> {
    const existing = this.admins.get(id);
    if (!existing) throw new NotFoundException('Admin not found');

    const userId = resolveUserId(update?.userId);
    if (!userId) return existing;

    const replacement = Admin.create({
      id: existing.id.value,
      userId,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    });

    this.admins.set(id, replacement);

    return replacement;
  }

  async exists(id: string): Promise<boolean> {
    return this.admins.has(id);
  }

  async count(): Promise<number> {
    return this.admins.size;
  }

  async findByUserId(userId: string): Promise<Admin | null> {
    return (
      [...this.admins.values()].find(
        (admin) => admin.userId.value === userId,
      ) ?? null
    );
  }
}

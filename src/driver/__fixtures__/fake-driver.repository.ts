import { Driver } from '../domain/entities/driver.entity';
import { DriverRepository } from '../domain/repositories/driver.repository';

/**
 * Keyed by driver id, with secondary lookups scanning — the collections here are a
 * handful of rows, so the indexes the real queries rely on are not worth reproducing.
 */
export class FakeDriverRepository extends DriverRepository {
  readonly drivers = new Map<string, Driver>();

  /** Drivers handed to `save`, in call order. */
  readonly saved: Driver[] = [];

  /** Drivers handed to `update`, in call order. */
  readonly updated: Driver[] = [];

  /** Ids handed to `delete`, in call order. */
  readonly deleted: string[] = [];

  seed(...drivers: Driver[]): this {
    for (const driver of drivers) this.drivers.set(driver.id.value, driver);
    return this;
  }

  async findById(id: string): Promise<Driver | null> {
    return this.drivers.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    return (
      [...this.drivers.values()].find(
        (driver) => driver.userId.value === userId,
      ) ?? null
    );
  }

  async findByLicensingNumber(licensingNumber: string): Promise<Driver | null> {
    return (
      [...this.drivers.values()].find(
        (driver) => driver.licensingNumber === licensingNumber,
      ) ?? null
    );
  }

  async findAll(): Promise<Driver[]> {
    return [...this.drivers.values()];
  }

  async save(driver: Driver): Promise<void> {
    this.saved.push(driver);
    this.drivers.set(driver.id.value, driver);
  }

  async update(driver: Driver): Promise<void> {
    this.updated.push(driver);
    this.drivers.set(driver.id.value, driver);
  }

  async delete(id: string): Promise<void> {
    this.deleted.push(id);
    this.drivers.delete(id);
  }
}

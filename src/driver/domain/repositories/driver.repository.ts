import { Driver } from '../entities/driver.entity';

export abstract class DriverRepository {
  abstract findById(id: string): Promise<Driver | null>;
  abstract findByUserId(userId: string): Promise<Driver | null>;
  abstract findByLicensingNumber(licensingNumber: string): Promise<Driver | null>;
  abstract findAll(): Promise<Driver[]>;
  abstract save(driver: Driver): Promise<void>;
  abstract update(driver: Driver): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

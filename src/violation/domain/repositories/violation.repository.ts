import { Violation } from '../entities/violation.entity';

export interface ViolationFilters {
  driverId?: string;
  vehicleId?: string;
  status?: 'pending' | 'paid';
}

export abstract class ViolationRepository {
  abstract save(violation: Violation): Promise<Violation>;
  abstract findById(id: string): Promise<Violation | null>;
  abstract findAll(offset?: number, limit?: number): Promise<Violation[]>;
  abstract removeById(id: string): Promise<Violation | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(filters?: ViolationFilters): Promise<number>;

  abstract findByDriverId(driverId: string): Promise<Violation[]>;
  abstract findByVehicleId(vehicleId: string): Promise<Violation[]>;
  abstract findUnpaidByDriverId(driverId: string): Promise<Violation[]>;
  abstract findWithFilters(
    filters: ViolationFilters,
    offset?: number,
    limit?: number,
  ): Promise<Violation[]>;
}

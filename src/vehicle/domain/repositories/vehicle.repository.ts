import { Vehicle } from '../entities/vehicle.entity';

export abstract class VehicleRepository {
  abstract save(vehicle: Vehicle): Promise<Vehicle>;
  abstract findById(id: string): Promise<Vehicle | null>;
  abstract findAll(offset?: number, limit?: number): Promise<Vehicle[]>;
  abstract removeById(id: string): Promise<Vehicle | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findByDriverId(driverId: string): Promise<Vehicle[]>;
  abstract findByPlateNumber(plateNumber: string): Promise<Vehicle | null>;
}

import { VehicleLicense } from '../entities/vehicle-license.entity';

export abstract class VehicleLicenseRepository {
  abstract save(license: VehicleLicense): Promise<VehicleLicense>;
  abstract findById(id: string): Promise<VehicleLicense | null>;
  abstract findByVehicleId(vehicleId: string): Promise<VehicleLicense | null>;
  abstract findAll(offset?: number, limit?: number): Promise<VehicleLicense[]>;
  abstract removeById(id: string): Promise<VehicleLicense | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
}

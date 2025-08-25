import { Injectable } from '@nestjs/common';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import {
  VehicleLicense,
  VehicleLicenseStatus,
} from 'src/vehicle-license/domain/entities/vehicle-license.entity';

export interface CreateVehicleInputDto {
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  vin: string;
  status: Vehicle['status']; // VehicleStatus
  assignedDriverId: string; // optional per spec
  notes?: string;
  nextMaintenanceDate?: Date;
  // Additional fields from spec that are not yet modeled in the domain
  photos?: string[];
  license?: {
    licenseIssueDate: Date;
    licenseExpiryDate: Date;
    licenseNumber: string;
    insurancePolicyNumber?: string;
    insuranceExpiryDate?: Date;
  };
}

@Injectable()
export class CreateVehicleUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute(dto: CreateVehicleInputDto): Promise<Vehicle> {
    const vehicle = Vehicle.create({
      id: UUID.create().toString(),
      make: dto.make,
      model: dto.model,
      year: dto.year,
      plateNumber: dto.plateNumber,
      vin: dto.vin,
      status: dto.status,
      // minimal shape; repository handles relation connect
      driver: dto.assignedDriverId
        ? ({ id: dto.assignedDriverId } as any)
        : (null as any),
      license: undefined as any,
      notes: dto.notes,
      nextMaintenanceDate: dto.nextMaintenanceDate,
    });

    const license = dto.license
      ? VehicleLicense.create({
          vehicle: vehicle,
          licenseNumber: dto.license.licenseNumber,
          issueDate: dto.license.licenseIssueDate,
          expiryDate: dto.license.licenseExpiryDate,
          insurancePolicyNumber: dto.license.insurancePolicyNumber,
          insuranceExpiryDate: dto.license.insuranceExpiryDate,
          status: VehicleLicenseStatus.ACTIVE,
        })
      : undefined;

    vehicle.license = license;

    return this.vehicleRepo.save(vehicle);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { CreateVehicleInputDto } from './create-vehicle.use-case';
import {
  VehicleLicense,
  VehicleLicenseStatus,
} from 'src/vehicle-license/domain/entities/vehicle-license.entity';

interface UpdateVehicleInputDto
  extends Partial<Omit<CreateVehicleInputDto, 'license'>> {
  license?: {
    licenseIssueDate?: Date;
    licenseExpiryDate?: Date;
    licenseNumber?: string;
    insurancePolicyNumber?: string;
    insuranceExpiryDate?: Date;
  };
}

@Injectable()
export class UpdateVehicleUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute(id: string, dto: UpdateVehicleInputDto): Promise<Vehicle> {
    const existing = await this.vehicleRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'vehicle_not_found' });

    if (dto.make !== undefined) existing.make = dto.make;
    if (dto.model !== undefined) existing.model = dto.model;
    if (dto.year !== undefined) existing.year = dto.year;
    if (dto.plateNumber !== undefined) existing.plateNumber = dto.plateNumber;
    if (dto.vin !== undefined) existing.vin = dto.vin;
    if (dto.status !== undefined) existing.status = dto.status as any;
    if (dto.assignedDriverId !== undefined)
      existing.driver = (
        dto.assignedDriverId ? ({ id: dto.assignedDriverId } as any) : null
      ) as any;
    if (dto.notes !== undefined) existing.notes = dto.notes ?? undefined;
    if (dto.nextMaintenanceDate !== undefined)
      existing.nextMaintenanceDate = dto.nextMaintenanceDate ?? undefined;

    this.upsertLicense(dto.license, existing);

    return this.vehicleRepo.save(existing);
  }

  upsertLicense(license: UpdateVehicleInputDto['license'], vehicle: Vehicle) {
    if (!license) return;

    if (!vehicle.license) {
      if (
        !license.licenseExpiryDate ||
        !license.licenseNumber ||
        !license.licenseIssueDate
      ) {
        throw new BadRequestException({ license: 'data_incomplete' });
      }

      vehicle.license = VehicleLicense.create({
        vehicle,
        ...license,
        licenseNumber: license.licenseNumber,
        expiryDate: license.licenseExpiryDate,
        issueDate: license.licenseIssueDate,
        status: VehicleLicenseStatus.ACTIVE,
      });
    } else {
      if (vehicle.license.licenseNumber !== license.licenseNumber) {
        vehicle.license.licenseNumber = license.licenseNumber;
      }
      if (vehicle.license.issueDate !== license.licenseIssueDate) {
        vehicle.license.issueDate = license.licenseIssueDate;
      }
      if (vehicle.license.expiryDate !== license.licenseExpiryDate) {
        vehicle.license.expiryDate = license.licenseExpiryDate;
      }
      if (vehicle.license.insuranceExpiryDate !== license.insuranceExpiryDate) {
        vehicle.license.insuranceExpiryDate = license.insuranceExpiryDate;
      }
      if (
        vehicle.license.insurancePolicyNumber !== license.insurancePolicyNumber
      ) {
        vehicle.license.insurancePolicyNumber = license.insurancePolicyNumber;
      }
    }
  }
}

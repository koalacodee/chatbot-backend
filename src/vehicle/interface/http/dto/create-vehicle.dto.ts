import { Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsDate,
} from 'class-validator';
import { VehicleStatus } from 'src/vehicle/domain/entities/vehicle.entity';

export class LicenseDto {
  @IsString()
  licenseNumber: string;

  @IsDate()
  @Type(() => Date)
  licenseIssueDate: Date;

  @IsDate()
  @Type(() => Date)
  licenseExpiryDate: Date;

  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  insuranceExpiryDate?: Date;
}

export class CreateVehicleInputDto {
  @IsString()
  make: string;

  @IsString()
  model: string;

  @IsInt()
  year: number;

  @IsString()
  plateNumber: string;

  @IsString()
  vin: string;

  @IsEnum(VehicleStatus)
  status: VehicleStatus; // validated at domain/repo level

  @IsString()
  assignedDriverId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  nextMaintenanceDate?: Date;

  @IsOptional()
  photos?: string[];

  @IsOptional()
  @Type(() => LicenseDto)
  @ValidateNested()
  license?: LicenseDto;
}

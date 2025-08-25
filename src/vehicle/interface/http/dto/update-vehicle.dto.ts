import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateVehicleInputDto, LicenseDto } from './create-vehicle.dto';
import { Type } from 'class-transformer';

export class UpdateVehicleInputDto extends PartialType(
  OmitType(CreateVehicleInputDto, ['license']),
) {
  @IsOptional()
  @Type(() => PartialType(LicenseDto))
  @ValidateNested()
  license?: Partial<LicenseDto>;
}

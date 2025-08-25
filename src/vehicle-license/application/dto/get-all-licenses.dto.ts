import { IsOptional, IsString, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllLicensesInputDto {
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'])
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetViolationsInputDto {
  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'paid'])
  status?: 'pending' | 'paid';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

export interface GetViolationsOutputDto {
  data: any[]; // Will map from Violation entity
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

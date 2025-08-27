import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class PaginateDto {
  @IsOptional()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  limit?: number;

  @IsOptional()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  page?: number;
}

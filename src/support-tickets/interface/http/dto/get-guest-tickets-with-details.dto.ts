import { IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class GetGuestTicketsWithDetailsDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  limit?: number;
}

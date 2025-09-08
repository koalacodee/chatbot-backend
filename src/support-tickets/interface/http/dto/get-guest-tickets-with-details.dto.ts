import { IsOptional, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class GetGuestTicketsWithDetailsDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  limit?: number;
}

import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllMembersDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}

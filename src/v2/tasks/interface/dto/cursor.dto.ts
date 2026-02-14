import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CursorDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsEnum(['next', 'prev'])
  direction?: 'next' | 'prev';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

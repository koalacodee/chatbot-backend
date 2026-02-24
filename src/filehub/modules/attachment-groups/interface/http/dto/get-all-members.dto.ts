import { IsInt, IsOptional, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllMembersDto {
  @IsString()
  @IsOptional()
  cursor?: string;

  @IsIn(['next', 'prev'])
  @IsOptional()
  direction?: 'next' | 'prev';

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsString()
  @IsOptional()
  filterDepartmentId?: string;
}

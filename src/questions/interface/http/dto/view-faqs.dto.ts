import { IsOptional, IsPositive, IsUUID } from 'class-validator';

export class ViewFaqsDto {
  @IsOptional()
  @IsPositive()
  limit?: number;

  @IsOptional()
  @IsPositive()
  page?: number;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

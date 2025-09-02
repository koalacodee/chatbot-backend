import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GetSharedDepartmentFaqsDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsUUID()
  subDepartmentId?: string;
}

import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { DepartmentVisibility } from '../../../domain/entities/department.entity';

export class CreateDepartmentInputDto {
  @IsString()
  name: string;

  @IsEnum(DepartmentVisibility)
  visibility: DepartmentVisibility;

  @IsOptional()
  @IsBoolean()
  isExposedToTvContent?: boolean;

  @IsOptional()
  @IsString()
  knowledgeChunkContent?: string;
}

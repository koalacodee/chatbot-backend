import { IsString, IsEnum, IsOptional } from 'class-validator';
import { DepartmentVisibility } from '../../../domain/entities/department.entity';

export class CreateDepartmentInputDto {
  @IsString()
  name: string;

  @IsEnum(DepartmentVisibility)
  visibility: DepartmentVisibility;

  @IsOptional()
  @IsString()
  knowledgeChunkContent?: string;
}

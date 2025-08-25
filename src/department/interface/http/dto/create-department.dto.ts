import { IsString, IsEnum } from 'class-validator';
import { DepartmentVisibility } from '../../../domain/entities/department.entity';

export class CreateDepartmentInputDto {
  @IsString()
  name: string;

  @IsEnum(DepartmentVisibility)
  visibility: DepartmentVisibility;
}
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { DepartmentVisibility } from '../../../domain/entities/department.entity';
import { OmitType } from '@nestjs/swagger';

export class UpdateDepartmentInputDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DepartmentVisibility)
  visibility?: DepartmentVisibility;
}

export class UpdateSubDepartmentInputDto extends OmitType(
  UpdateDepartmentInputDto,
  ['visibility'],
) {
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

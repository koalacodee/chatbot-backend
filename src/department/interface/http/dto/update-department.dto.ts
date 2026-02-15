import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { DepartmentVisibility } from '../../../domain/entities/department.entity';
import { OmitType } from '@nestjs/swagger';

export class UpdateDepartmentInputDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DepartmentVisibility)
  visibility?: DepartmentVisibility;

  @IsOptional()
  @IsBoolean()
  isExposedToTvContent?: boolean;
}

export class UpdateSubDepartmentInputDto extends OmitType(
  UpdateDepartmentInputDto,
  ['visibility'],
) {
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

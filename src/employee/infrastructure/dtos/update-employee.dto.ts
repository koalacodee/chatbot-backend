import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';
import { EmployeePermissions } from '../../domain/entities/employee.entity';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsArray()
  permissions?: EmployeePermissions[];

  @IsOptional()
  @IsUUID()
  supervisorId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  subDepartmentIds?: string[];

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

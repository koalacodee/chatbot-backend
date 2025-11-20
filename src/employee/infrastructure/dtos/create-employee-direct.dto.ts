import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';

export class CreateEmployeeDirectDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsString()
  jobTitle: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsArray()
  @IsNotEmpty()
  permissions: EmployeePermissionsEnum[];

  @IsNotEmpty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  subDepartmentIds: string[];

  @IsOptional()
  @IsUUID()
  supervisorUserId?: string;
}

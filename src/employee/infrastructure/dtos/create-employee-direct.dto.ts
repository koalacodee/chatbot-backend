import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsStrongPassword,
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
  username: string;

  @IsNotEmpty()
  @IsString()
  jobTitle: string;

  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsArray()
  @IsNotEmpty()
  permissions: EmployeePermissionsEnum[];

  @IsNotEmpty()
  @IsUUID()
  supervisorId: string;

  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  subDepartmentIds: string[];
}

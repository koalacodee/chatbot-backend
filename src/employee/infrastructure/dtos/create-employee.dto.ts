import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { EmployeePermissions } from '../../domain/entities/employee.entity';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsArray()
  @IsNotEmpty()
  permissions: EmployeePermissions[];

  @IsNotEmpty()
  @IsUUID()
  supervisorId: string;

  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  subDepartmentIds: string[];
}

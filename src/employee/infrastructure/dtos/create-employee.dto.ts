import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsArray()
  @IsNotEmpty()
  permissions: EmployeePermissionsEnum[];

  @IsNotEmpty()
  @IsUUID()
  supervisorId: string;

  @IsNotEmpty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  subDepartmentIds: string[];
}

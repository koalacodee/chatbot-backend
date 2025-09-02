import { IsArray, ArrayNotEmpty, IsEnum } from 'class-validator';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';

export class GetEmployeesByPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EmployeePermissionsEnum, { each: true })
  permissions: EmployeePermissionsEnum[];
}

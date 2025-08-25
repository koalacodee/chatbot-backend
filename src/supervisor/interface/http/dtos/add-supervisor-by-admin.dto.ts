import { IsString, IsEmail, IsOptional, IsArray, IsEnum } from 'class-validator';
import { SupervisorPermissions } from '../../../domain/entities/supervisor.entity';

export class AddSupervisorByAdminDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsString()
  jobTitle: string;

  @IsArray()
  departmentIds: string[];

  @IsArray()
  @IsEnum(SupervisorPermissions, { each: true })
  permissions: SupervisorPermissions[];
}

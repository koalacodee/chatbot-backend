import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsDate,
  IsNotEmpty,
} from 'class-validator';

export class AddDriverBySupervisorDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  temporaryPassword: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsString()
  @IsNotEmpty()
  licensingNumber: string;

  @IsDate()
  @Type(() => Date)
  drivingLicenseExpiry: Date;
}

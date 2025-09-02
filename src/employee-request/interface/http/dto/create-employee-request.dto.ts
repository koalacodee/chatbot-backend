import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsStrongPassword,
} from 'class-validator';

export class CreateEmployeeRequestDto {
  @IsEmail()
  newEmployeeEmail: string;

  @IsNotEmpty()
  @IsString()
  newEmployeeFullName: string;

  @IsNotEmpty()
  @IsString()
  newEmployeeUsername: string;

  @IsNotEmpty()
  @IsString()
  newEmployeeJobTitle: string;

  @IsNotEmpty()
  @IsString()
  newEmployeeId: string;

  @IsNotEmpty()
  @IsStrongPassword()
  temporaryPassword: string;

  @IsOptional()
  @IsString()
  newEmployeeDesignation?: string;
}

import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

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
  @IsString()
  temporaryPassword: string;

  @IsOptional()
  @IsString()
  newEmployeeDesignation?: string;
}

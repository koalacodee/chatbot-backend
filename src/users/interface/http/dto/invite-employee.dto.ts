import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsDate,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class InviteEmployeeDto {
  @IsString()
  @MinLength(2, {
    message: 'Name is too short. Minimum 2 characters required.',
  })
  @MaxLength(50, {
    message: 'Name is too long. Maximum 50 characters allowed.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsEmail({}, { message: 'Invalid email address.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsOptional()
  @ValidateIf(
    (obj) =>
      obj.expiresIn !== undefined &&
      obj.expiresIn !== null &&
      obj.expiresIn !== '',
  )
  @Transform(({ value }) => (value ? new Date(value) : undefined), {
    toClassOnly: true,
  })
  @IsDate({ message: 'expiresIn must be a valid date.' })
  expiresIn?: Date;
}

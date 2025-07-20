import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsStrongPassword,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CompleteAccountDto {
  @IsString({ message: 'Token must be a string.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  token: string;

  @IsString({ message: 'Name must be a string.' })
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

  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(64, { message: 'Password must be at most 64 characters.' })
  @IsStrongPassword(
    {},
    {
      message: 'Password must contain at least one letter and one number.',
    },
  )
  password: string;
}

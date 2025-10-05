import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';

export class RegisterGuestDto {
  @IsNotEmpty({ message: 'name_required' })
  @IsString({ message: 'name_must_be_string' })
  @MinLength(2, { message: 'name_too_short' })
  @MaxLength(50, { message: 'name_too_long' })
  name: string;

  @IsNotEmpty({ message: 'email_required' })
  @IsEmail({}, { message: 'email_invalid' })
  email: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}

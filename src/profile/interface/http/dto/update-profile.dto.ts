import { IsOptional, IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'name_too_short' })
  @MaxLength(255, { message: 'name_too_long' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'username_too_short' })
  @MaxLength(255, { message: 'username_too_long' })
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email_invalid' })
  email?: string;
}


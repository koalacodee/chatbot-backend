import { IsNotEmpty, IsString } from 'class-validator';

export class LoginGuestDto {
  @IsNotEmpty({ message: 'identifier_required' })
  @IsString({ message: 'identifier_must_be_string' })
  identifier: string;

  @IsNotEmpty({ message: 'password_required' })
  @IsString({ message: 'password_must_be_string' })
  password: string;
}

import { IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'email_required' })
  email: string;
  @IsNotEmpty({ message: 'password_required' })
  password: string;
}

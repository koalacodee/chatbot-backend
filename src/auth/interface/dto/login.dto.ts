import { IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'username_required' })
  username: string;
  @IsNotEmpty({ message: 'password_required' })
  password: string;
}

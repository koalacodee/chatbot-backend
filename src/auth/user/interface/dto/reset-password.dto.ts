import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Length(8, 8)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 128)
  newPassword: string;
}

import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @IsNotEmpty({ message: 'code_required' })
  @IsString({ message: 'code_must_be_string' })
  @Length(6, 6, { message: 'code_must_be_6_digits' })
  code: string;
}

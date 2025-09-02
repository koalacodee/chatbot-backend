import { IsNotEmpty, IsString } from 'class-validator';

export class LoginGuestDto {
  @IsNotEmpty({ message: 'identifier_required' })
  @IsString({ message: 'identifier_must_be_string' })
  identifier: string;
}

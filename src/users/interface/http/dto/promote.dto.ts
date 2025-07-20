import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class PromoteDto {
  @IsUUID('4', { message: 'id_invalid' })
  @IsNotEmpty({ message: 'id_required' })
  id: string;

  @IsEnum(['ADMIN', 'MANAGER'], { message: 'role_invalid' })
  @IsNotEmpty({ message: 'role_required' })
  role: 'ADMIN' | 'MANAGER';
}

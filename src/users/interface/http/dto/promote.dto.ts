import { IsEnum, IsNotEmpty, IsUUID, ValidateIf } from 'class-validator';

export class PromoteDto {
  @IsUUID('4', { message: 'id_invalid' })
  @IsNotEmpty({ message: 'id_required' })
  id: string;

  @IsEnum(['ADMIN', 'MANAGER'], { message: 'role_invalid' })
  @IsNotEmpty({ message: 'role_required' })
  role: 'ADMIN' | 'MANAGER';

  @ValidateIf((o: PromoteDto) => o.role === 'ADMIN')
  @IsUUID('4', { message: 'department_id_invalid' })
  @IsNotEmpty({ message: 'department_id_required' })
  departmentId: string;
}

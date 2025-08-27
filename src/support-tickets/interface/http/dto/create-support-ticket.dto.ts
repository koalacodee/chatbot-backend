import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsUUID()
  departmentId: string;
}

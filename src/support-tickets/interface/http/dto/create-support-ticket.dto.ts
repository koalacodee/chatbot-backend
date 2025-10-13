import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

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

  @IsString()
  guestName: string;

  @IsString()
  guestPhone: string;

  @IsEmail()
  guestEmail: string;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}

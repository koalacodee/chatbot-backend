import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
} from 'class-validator';

export class AnswerSupportTicketDto {
  @ApiProperty({ description: 'Answer content' })
  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  attach?: boolean;

  @ApiProperty({ description: 'Attachment IDs to clone', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}

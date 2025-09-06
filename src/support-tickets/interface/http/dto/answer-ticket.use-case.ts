import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AnswerTicketDto {
  @ApiProperty({ description: 'Answer content' })
  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  attach?: boolean;
}

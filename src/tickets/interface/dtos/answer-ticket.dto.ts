import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerTicketDto {
  @ApiProperty({ description: 'Ticket ID' })
  @IsString()
  @IsUUID()
  ticketId: string;

  @ApiProperty({ description: 'Answer content' })
  @IsString()
  content: string;
}

export class AnswerTicketResponseDto {
  @ApiProperty({ description: 'Ticket ID' })
  ticketId: string;

  @ApiProperty({ description: 'Answer ID' })
  answerId: string;

  @ApiProperty({ description: 'Answer content' })
  content: string;

  @ApiProperty({ description: 'Answer creation date' })
  answeredAt: Date;
}
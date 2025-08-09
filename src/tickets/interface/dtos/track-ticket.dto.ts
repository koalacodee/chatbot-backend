import { ApiProperty } from '@nestjs/swagger';

export class TrackTicketDto {
  @ApiProperty({ description: 'Ticket code to track' })
  ticketCode: string;
}

export class TrackTicketResponseDto {
  @ApiProperty({ description: 'Ticket ID' })
  id: string;

  @ApiProperty({ description: 'Ticket code' })
  code: string;

  @ApiProperty({ description: 'Current status', enum: ['pending', 'answered', 'resolved'] })
  status: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Question text' })
  question: string;

  @ApiProperty({ description: 'Answer content', required: false })
  answer?: string;
}
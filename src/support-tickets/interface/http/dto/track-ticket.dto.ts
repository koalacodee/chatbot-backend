import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TrackTicketDto {
  @ApiProperty({ description: 'Ticket code to track' })
  @IsNotEmpty()
  @IsString()
  code: string;
}

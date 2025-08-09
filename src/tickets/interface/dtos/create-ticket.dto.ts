import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Department ID' })
  @IsString()
  @IsUUID()
  departmentId: string;

  @ApiProperty({ description: 'Question text' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Guest ID (optional)', required: false })
  @IsOptional()
  @IsString()
  guestId?: string;
}

export class CreateTicketResponseDto {
  @ApiProperty({ description: 'Generated ticket code' })
  ticket: string;
}
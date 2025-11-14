import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveTaskDelegationDto {
  @ApiProperty({
    description: 'Optional feedback for the approval',
    example: 'Great work!',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}


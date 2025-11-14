import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectTaskDelegationDto {
  @ApiProperty({
    description: 'Optional feedback explaining the rejection',
    example: 'Please revise and resubmit',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}


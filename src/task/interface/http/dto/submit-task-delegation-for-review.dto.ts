import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitTaskDelegationForReviewDto {
  @ApiProperty({
    description: 'Optional notes for the submission',
    example: 'Task completed successfully',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Whether to attach files to the submission',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @ApiProperty({ description: 'Attachment IDs to clone', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}

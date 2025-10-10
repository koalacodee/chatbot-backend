import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class SaveTaskPresetDto {
  @ApiProperty({
    description: 'ID of the task to save as preset',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({
    description: 'Name for the preset',
    example: 'Weekly Report Template',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  presetName: string;
}

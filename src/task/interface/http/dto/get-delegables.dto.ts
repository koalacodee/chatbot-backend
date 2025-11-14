import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetDelegablesQueryDto {
  @ApiProperty({
    description: 'Optional search query to filter employees by name, email, username, or ID, and departments by name',
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string;
}


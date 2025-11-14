import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DelegationIdDto {
  @ApiProperty({
    description: 'The ID of the task delegation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  delegationId: string;
}


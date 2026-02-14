import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SubDepartmentIdDto {
  @ApiProperty({
    description: 'Sub-department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  subDepartmentId: string;
}

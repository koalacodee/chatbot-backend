import { IsString, IsUUID, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DelegateTaskDto {
  @ApiProperty({
    description: 'The ID of the task to delegate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  taskId: string;

  @ApiProperty({
    description: 'The ID of the employee to assign the task to (required for individual assignment)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  @ValidateIf((o) => !o.targetSubDepartmentId)
  assigneeId?: string;

  @ApiProperty({
    description: 'The ID of the sub-department to assign the task to (required for sub-department assignment)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  @ValidateIf((o) => !o.assigneeId)
  targetSubDepartmentId?: string;
}

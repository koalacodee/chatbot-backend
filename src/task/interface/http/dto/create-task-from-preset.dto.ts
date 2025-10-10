import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import {
  TaskAssignmentType,
  TaskPriority,
} from '../../../domain/entities/task.entity';

export class CreateTaskFromPresetDto {
  @ApiProperty({
    description: 'ID of the preset to use',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  presetId: string;

  @ApiProperty({
    description: 'Override title',
    example: 'Updated Task Title',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Override description',
    example: 'Updated task description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Override due date',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    description: 'Override assignee ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({
    description: 'Override approver ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  approverId?: string;

  @ApiProperty({
    description: 'Override assignment type',
    enum: TaskAssignmentType,
    required: false,
  })
  @IsEnum(TaskAssignmentType)
  @IsOptional()
  assignmentType?: TaskAssignmentType;

  @ApiProperty({
    description: 'Override target department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  targetDepartmentId?: string;

  @ApiProperty({
    description: 'Override target sub-department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  targetSubDepartmentId?: string;

  @ApiProperty({
    description: 'Override priority',
    enum: TaskPriority,
    required: false,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Whether to attach files',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  attach?: boolean;

  @ApiProperty({
    description: 'Override reminder interval in milliseconds',
    example: 3600000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  reminderInterval?: number;
}

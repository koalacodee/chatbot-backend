import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsBoolean,
  IsPositive,
  Min,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from 'src/task/domain/entities/task.entity';

export enum CreateTaskAssignmentType {
  INDIVIDUAL = 'INDIVIDUAL',
  DEPARTMENT = 'DEPARTMENT',
  SUB_DEPARTMENT = 'SUB_DEPARTMENT',
}

export class CreateTaskInputDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(CreateTaskAssignmentType)
  assignmentType: CreateTaskAssignmentType;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  targetDepartmentId?: string;

  @IsOptional()
  @IsString()
  targetSubDepartmentId?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  completedAt?: Date;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsPositive()
  @Min(60000) // Minimum 1 minute (60000ms)
  reminderInterval?: number; // in milliseconds

  @ApiProperty({
    description: 'Whether to save this task as a preset automatically',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  savePreset?: boolean;

  @ApiProperty({ description: 'Attachment IDs to clone', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}

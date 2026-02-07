import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ReminderDto } from './create-task.dto';
import { TaskPriority, TaskStatus } from 'src/task/domain/entities/task.entity';

export enum UpdateTaskAssignmentType {
  INDIVIDUAL = 'INDIVIDUAL',
  DEPARTMENT = 'DEPARTMENT',
  SUB_DEPARTMENT = 'SUB_DEPARTMENT',
}

export class UpdateTaskInputDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  assignerId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  targetDepartmentId?: string | null;

  @IsOptional()
  @IsString()
  targetSubDepartmentId?: string | null;

  @IsOptional()
  @IsString()
  completedAt?: string | null;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteAttachments?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderDto)
  addReminders?: ReminderDto[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteReminders?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}

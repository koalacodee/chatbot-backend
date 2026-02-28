import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  TaskStatus,
  TaskPriority,
} from '../../domain/entities/task.entity';
import { TaskResponseDto } from './create-task.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class UpdateTaskReminderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsDate()
  @Type(() => Date)
  reminderDate: Date;

  @IsNumber()
  @Min(0)
  reminderInterval: number;
}

export class UpdateTaskRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  assignerId?: string;

  @IsOptional()
  @IsString()
  approverId?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  targetDepartmentId?: string;

  @IsOptional()
  @IsUUID()
  targetSubDepartmentId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completedAt?: Date | null;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteAttachments?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteReminders?: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTaskReminderDto)
  @IsArray()
  addReminders?: UpdateTaskReminderDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  daysBeforeDeadlineReminder?: number;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class UpdateTaskResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskResponseDto)
  task: TaskResponseDto;

  @Expose()
  fileHubUploadKey?: string;
}

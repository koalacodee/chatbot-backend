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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../../domain/entities/task.entity';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class CreateTaskReminderDto {
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

export class CreateTaskRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsUUID()
  @ValidateIf(
    (o: CreateTaskRequestDto) =>
      o.targetDepartmentId === undefined &&
      o.targetSubDepartmentId === undefined,
  )
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  @ValidateIf(
    (o: CreateTaskRequestDto) =>
      o.assigneeId === undefined && o.targetSubDepartmentId === undefined,
  )
  targetDepartmentId?: string;

  @IsOptional()
  @IsUUID()
  @ValidateIf(
    (o: CreateTaskRequestDto) =>
      o.assigneeId === undefined && o.targetDepartmentId === undefined,
  )
  targetSubDepartmentId?: string;

  @IsOptional()
  @IsUUID()
  approverId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completedAt?: Date;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskReminderDto)
  @IsArray()
  reminders?: CreateTaskReminderDto[];

  @IsOptional()
  @IsBoolean()
  savePreset?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  daysBeforeDeadlineReminder?: number;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class TaskReminderResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  reminderDate: Date;

  @Expose()
  reminderInterval: number;

  @Expose()
  taskId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class TaskResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  dueDate?: Date;

  @Expose()
  creatorId: string;

  @Expose()
  assigneeId?: string;

  @Expose()
  assignerId?: string;

  @Expose()
  approverId?: string;

  @Expose()
  targetDepartmentId?: string;

  @Expose()
  targetSubDepartmentId?: string;

  @Expose()
  status: string;

  @Expose()
  assignmentType: string;

  @Expose()
  priority: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  completedAt?: Date;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskReminderResponseDto)
  reminders?: TaskReminderResponseDto[];

  @Expose()
  assigneeName?: string;

  @Expose()
  daysBeforeDeadlineReminder?: number;
}

export class CreateTaskResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskResponseDto)
  task: TaskResponseDto;

  @Expose()
  fileHubUploadKey?: string;
}

import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsDate } from 'class-validator';
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

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  approverId?: string;

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
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

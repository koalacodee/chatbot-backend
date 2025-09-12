import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TaskPriority } from 'src/task/domain/entities/task.entity';

export enum UpdateTaskAssignmentType {
  INDIVIDUAL = 'INDIVIDUAL',
  DEPARTMENT = 'DEPARTMENT',
  SUB_DEPARTMENT = 'SUB_DEPARTMENT',
}

export class UpdateTaskInputDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  assignerId?: string;

  @IsOptional()
  @IsString()
  approverId?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  // @IsOptional()
  // @IsEnum(UpdateTaskAssignmentType)
  // assignmentType?: UpdateTaskAssignmentType;

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
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  feedback?: string | null;
}

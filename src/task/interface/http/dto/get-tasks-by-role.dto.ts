import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  TaskAssignmentType,
  TaskPriority,
  TaskStatus,
} from '../../../domain/entities/task.entity';

export class GetTasksByRoleDto {
  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  subDepartmentId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TaskAssignmentType)
  assignmentType?: TaskAssignmentType;

  @IsOptional()
  offset?: number = 0;

  @IsOptional()
  limit?: number = 50;

  @IsOptional()
  @IsEnum(TaskStatus, { each: true })
  status?: TaskStatus | TaskStatus[];

  @IsOptional()
  @IsEnum(TaskPriority, { each: true })
  priority?: TaskPriority | TaskPriority[];

  @IsOptional()
  @IsString()
  search?: string;
}

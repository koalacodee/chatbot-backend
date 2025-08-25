import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskAssignmentType } from '../../../domain/entities/task.entity';

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
}

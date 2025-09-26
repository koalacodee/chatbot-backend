import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetDepartmentLevelTasksUseCase } from '../../../application/use-cases/get-department-level-tasks.use-case';
import { GetTasksByRoleDto } from '../dto/get-tasks-by-role.dto';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';

@ApiTags('Admin Tasks')
@ApiBearerAuth()
@Controller('tasks/admin')
export class AdminTaskController {
  constructor(
    private readonly getDepartmentLevelTasksUseCase: GetDepartmentLevelTasksUseCase,
  ) {}

  @Get('department-level')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get department-level tasks (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Department-level tasks retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @AdminAuth()
  async getDepartmentLevelTasks(@Query() query: GetTasksByRoleDto) {
    const result = await this.getDepartmentLevelTasksUseCase.execute({
      departmentId: query.departmentId,
    });

    return {
      success: true,
      data: result.tasks,
      metrics: result.metrics,
      attachments: result.attachments,
    };
  }
}

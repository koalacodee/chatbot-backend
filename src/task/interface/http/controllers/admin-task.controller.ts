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
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

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
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN)
  async getDepartmentLevelTasks(@Query() query: GetTasksByRoleDto) {
    const tasks = await this.getDepartmentLevelTasksUseCase.execute({
      departmentId: query.departmentId,
    });

    return {
      success: true,
      data: tasks,
      count: tasks.length,
    };
  }
}

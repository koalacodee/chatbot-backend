import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetSubDepartmentTasksUseCase } from '../../../application/use-cases/get-sub-department-tasks.use-case';
import { GetIndividualLevelTasksUseCase } from '../../../application/use-cases/get-individual-level-tasks.use-case';
import { GetTasksByRoleDto } from '../dto/get-tasks-by-role.dto';
import { SupervisorPermissions } from 'src/rbac/decorators';
import { SupervisorPermissionsEnum as SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';

@ApiTags('Supervisor Tasks')
@ApiBearerAuth()
@Controller('tasks/supervisor')
export class SupervisorTaskController {
  constructor(
    private readonly getSubDepartmentTasksUseCase: GetSubDepartmentTasksUseCase,
    private readonly getIndividualLevelTasksUseCase: GetIndividualLevelTasksUseCase,
  ) {}

  @Get('sub-department')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sub-department level tasks (Supervisor only)' })
  @ApiResponse({
    status: 200,
    description: 'Sub-department tasks retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Supervisor access required',
  })
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  async getSubDepartmentTasks(@Query() query: GetTasksByRoleDto) {
    const tasks = await this.getSubDepartmentTasksUseCase.execute({
      subDepartmentId: query.subDepartmentId,
    });

    return {
      success: true,
      data: tasks,
      count: tasks.length,
    };
  }

  @Get('employee-level')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get employee-level tasks within supervisor department',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee-level tasks retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Supervisor access required',
  })
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  async getEmployeeLevelTasks(@Query() query: GetTasksByRoleDto) {
    const tasks = await this.getIndividualLevelTasksUseCase.execute({
      assigneeId: query.assigneeId,
    });

    return {
      success: true,
      data: tasks,
      count: tasks.length,
    };
  }
}

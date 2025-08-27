import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  CreateTaskUseCase,
  UpdateTaskUseCase,
  GetTaskUseCase,
  GetAllTasksUseCase,
  DeleteTaskUseCase,
  CountTasksUseCase,
  SubmitTaskForReviewUseCase,
  ApproveTaskUseCase,
  RejectTaskUseCase,
  MarkTaskSeenUseCase,
  GetTasksWithFiltersUseCase,
  GetTeamTasksUseCase,
} from '../../application/use-cases';
import {
  CreateTaskInputDto,
  UpdateTaskInputDto,
  SubmitTaskForReviewInputDto,
  ApproveTaskInputDto,
  RejectTaskInputDto,
  GetTasksWithFiltersDto,
} from './dto';
import { GetTeamTasksDto } from './dto/get-team-tasks.dto';
import { Task, TaskAssignmentType } from '../../domain/entities/task.entity';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';
import { TaskStatus } from '@prisma/client';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly createUseCase: CreateTaskUseCase,
    private readonly updateUseCase: UpdateTaskUseCase,
    private readonly getUseCase: GetTaskUseCase,
    private readonly getAllUseCase: GetAllTasksUseCase,
    private readonly deleteUseCase: DeleteTaskUseCase,
    private readonly countUseCase: CountTasksUseCase,
    private readonly submitForReviewUseCase: SubmitTaskForReviewUseCase,
    private readonly approveTaskUseCase: ApproveTaskUseCase,
    private readonly rejectTaskUseCase: RejectTaskUseCase,
    private readonly markTaskSeenUseCase: MarkTaskSeenUseCase,
    private readonly getTasksWithFiltersUseCase: GetTasksWithFiltersUseCase,
    private readonly getTeamTasksUseCase: GetTeamTasksUseCase,
  ) {}

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post()
  async create(
    @Body() input: CreateTaskInputDto,
    @Req() req: any,
  ): Promise<Task> {
    return this.createUseCase.execute({
      ...input,
      assignerId: req.user.id,
      assignerRole: req.user.role.getRole(),
      assignmentType: TaskAssignmentType[input.assignmentType],
      status: input.status ?? TaskStatus.TODO,
    });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Put()
  async update(@Body() input: UpdateTaskInputDto): Promise<Task> {
    const { id, completedAt, ...rest } = input;
    return this.updateUseCase.execute(id, {
      ...rest,
      completedAt: completedAt
        ? new Date(completedAt)
        : (completedAt ?? undefined),
    } as any);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get(':id')
  async get(@Param('id') id: string): Promise<Task> {
    return this.getUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get()
  async getAll(
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const list = await this.getAllUseCase.execute(
      offset ? parseInt(offset, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
    return list.map((t) => t.toJSON());
  }

  // Filtered retrieval
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('search/filters')
  async getWithFilters(@Query() query: GetTasksWithFiltersDto): Promise<any[]> {
    const tasks = await this.getTasksWithFiltersUseCase.execute({
      ...query,
      // class-transformer handles numeric conversion for offset/limit
    });
    return tasks.map((t) => t.toJSON());
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Get('team-tasks')
  async getTeamTasks(@Query() query: GetTeamTasksDto): Promise<any[]> {
    const tasks = await this.getTeamTasksUseCase.execute(query);
    return tasks.map((t) => t.toJSON());
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Task | null> {
    return this.deleteUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('count/all')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }

  // Submit for review
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Post(':id/submit-review')
  async submitForReview(
    @Param('id') id: string,
    @Body() input: SubmitTaskForReviewInputDto,
    @Req() req: any,
  ): Promise<Task> {
    return this.submitForReviewUseCase.execute({
      taskId: id,
      submittedBy: req.user.id,
      notes: input.notes,
    });
  }

  // Approve
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() input: ApproveTaskInputDto,
  ): Promise<Task> {
    return this.approveTaskUseCase.execute({
      taskId: id,
      approverId: input.approverId,
    });
  }

  // Reject
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() input: RejectTaskInputDto,
  ): Promise<Task> {
    return this.rejectTaskUseCase.execute({
      taskId: id,
      feedback: input.feedback,
    });
  }

  // Mark seen
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Post(':id/seen')
  async markSeen(@Param('id') id: string): Promise<Task> {
    return this.markTaskSeenUseCase.execute({ taskId: id });
  }
}

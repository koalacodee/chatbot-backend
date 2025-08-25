import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  CreateQuestionUseCase,
  UpdateQuestionUseCase,
  GetQuestionUseCase,
  GetAllQuestionsUseCase,
  DeleteQuestionUseCase,
  DeleteManyQuestionsUseCase,
  CountQuestionsUseCase,
  GroupByDepartmentUseCase,
} from '../../application/use-cases';
import {
  CreateQuestionInputDto,
  UpdateQuestionInputDto,
  GetQuestionOutputDto,
  DeleteManyQuestionsInputDto,
} from './dto';
import { Question } from '../../domain/entities/question.entity';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

@Controller('questions')
export class QuestionController {
  constructor(
    private readonly createUseCase: CreateQuestionUseCase,
    private readonly updateUseCase: UpdateQuestionUseCase,
    private readonly getUseCase: GetQuestionUseCase,
    private readonly getAllUseCase: GetAllQuestionsUseCase,
    private readonly deleteUseCase: DeleteQuestionUseCase,
    private readonly deleteManyUseCase: DeleteManyQuestionsUseCase,
    private readonly countUseCase: CountQuestionsUseCase,
    private readonly getAllGroupedByDepartmentUseCase: GroupByDepartmentUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post()
  async create(
    @Body() input: CreateQuestionInputDto,
    @Req() req: any,
  ): Promise<Question> {
    return this.createUseCase.execute({ ...input, creatorId: req.user.id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Put(":id")
  async update(
    @Body() dto: UpdateQuestionInputDto,
    @Req() req: any,
    @Param("id") id: string,
  ): Promise<Question> {
    return this.updateUseCase.execute(id, { ...dto, userId: req.user.id });
  }

  @Get('grouped')
  async getAllGroupedByDepartment(): Promise<any> {
    return this.getAllGroupedByDepartmentUseCase.execute();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get(':id')
  async get(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetQuestionOutputDto | null> {
    return this.getUseCase.execute(id, req.user.id);
  }

  @Get()
  async getAll(@Query('departmentId') departmentId: string): Promise<any> {
    return this.getAllUseCase
      .execute(departmentId)
      .then((qs) => qs.map((qs) => qs.toJSON()));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetQuestionOutputDto | null> {
    return this.deleteUseCase.execute(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyQuestionsInputDto,
    @Req() req: any,
  ): Promise<Question[]> {
    return this.deleteManyUseCase.execute(input.ids, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('count')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}

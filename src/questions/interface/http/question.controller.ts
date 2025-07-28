import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  CreateQuestionUseCase,
  UpdateQuestionUseCase,
  GetQuestionUseCase,
  GetAllQuestionsUseCase,
  DeleteQuestionUseCase,
  DeleteManyQuestionsUseCase,
  CountQuestionsUseCase,
} from '../../application/use-cases';
import {
  CreateQuestionInputDto,
  UpdateQuestionInputDto,
  GetQuestionOutputDto,
  GetAllQuestionsOutputDto,
  DeleteQuestionInputDto,
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
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.MANAGER)
  @Post()
  async create(@Body() input: CreateQuestionInputDto): Promise<Question> {
    return this.createUseCase.execute(input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.MANAGER)
  @Put()
  async update(@Body() input: UpdateQuestionInputDto): Promise<Question> {
    const { id, ...dto } = input;
    return this.updateUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.MANAGER)
  @Get(':id')
  async get(@Param('id') id: string): Promise<GetQuestionOutputDto | null> {
    return this.getUseCase.execute(id);
  }

  @Get()
  async getAll(): Promise<GetAllQuestionsOutputDto> {
    return this.getAllUseCase.execute();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.MANAGER)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<GetQuestionOutputDto | null> {
    return this.deleteUseCase.execute(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.MANAGER)
  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyQuestionsInputDto,
  ): Promise<Question[]> {
    return this.deleteManyUseCase.execute(input.ids);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.MANAGER)
  @Get('count')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}

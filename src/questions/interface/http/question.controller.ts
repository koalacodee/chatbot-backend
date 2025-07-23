import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
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

  @Post()
  async create(@Body() input: CreateQuestionInputDto): Promise<Question> {
    return this.createUseCase.execute(input);
  }

  @Put()
  async update(@Body() input: UpdateQuestionInputDto): Promise<Question> {
    const { id, ...dto } = input;
    return this.updateUseCase.execute(id, dto);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<GetQuestionOutputDto | null> {
    return this.getUseCase.execute(id);
  }

  @Get()
  async getAll(): Promise<GetAllQuestionsOutputDto> {
    return this.getAllUseCase.execute();
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
  ): Promise<GetQuestionOutputDto | null> {
    return this.deleteUseCase.execute(id);
  }

  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyQuestionsInputDto,
  ): Promise<Question[]> {
    return this.deleteManyUseCase.execute(input.ids);
  }

  @Get('count')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}
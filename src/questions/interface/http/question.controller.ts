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
  BadRequestException,
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
  RecordRatingUseCase,
  RecordViewUseCase,
} from '../../application/use-cases';
import {
  CreateQuestionInputDto,
  UpdateQuestionInputDto,
  GetQuestionOutputDto,
  DeleteManyQuestionsInputDto,
} from './dto';
import { Question } from '../../domain/entities/question.entity';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';
import { ViewFaqsDto } from './dto/view-faqs.dto';
import { ViewFaqsUseCase } from 'src/questions/application/use-cases/view-faqs.use-case';
import { GuestAuth } from 'src/auth/guest/infrastructure/decorators/guest-auth.decorator';
import { RecordInteractionDto } from './dto/record-interaction.dto';

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
    private readonly viewFaqsUseCase: ViewFaqsUseCase,
    private readonly recordRatingUseCase: RecordRatingUseCase,
    private readonly recordViewUseCase: RecordViewUseCase,
  ) {}

  @Get('view')
  @GuestAuth()
  async viewFaqs(@Query() query: ViewFaqsDto, @Req() req: any): Promise<any> {
    return this.viewFaqsUseCase.execute({ ...query, guestId: req.user.id });
  }

  @GuestAuth()
  @Post(':type/:faqId')
  async recordInteraction(
    @Param() params: RecordInteractionDto,
    @Req() req: any,
  ) {
    const { faqId } = params;
    const handlers: Record<string, () => Promise<any>> = {
      satisfaction: () =>
        this.recordRatingUseCase.execute({
          guestId: req.user.id,
          faqId,
          satisfactionType: 'satisfied',
        }),
      dissatisfaction: () =>
        this.recordRatingUseCase.execute({
          guestId: req.user.id,
          faqId,
          satisfactionType: 'dissatisfied',
        }),
      view: () =>
        this.recordViewUseCase.execute({
          guestId: req.user.id,
          faqId,
        }),
    };

    const handler = handlers[params.type];
    if (!handler) {
      throw new BadRequestException('Invalid interaction type');
    }

    return handler();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post()
  async create(
    @Body() input: CreateQuestionInputDto,
    @Req() req: any,
  ): Promise<Question> {
    return this.createUseCase.execute({ ...input, creatorId: req.user.id });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Put(':id')
  async update(
    @Body() dto: UpdateQuestionInputDto,
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<Question> {
    return this.updateUseCase.execute(id, { ...dto, userId: req.user.id });
  }

  @Get('grouped')
  async getAllGroupedByDepartment(): Promise<any> {
    return this.getAllGroupedByDepartmentUseCase.execute();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetQuestionOutputDto | null> {
    return this.deleteUseCase.execute(id, req.user.id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyQuestionsInputDto,
    @Req() req: any,
  ): Promise<Question[]> {
    return this.deleteManyUseCase.execute(input.ids, req.user.id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('count')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Query,
  BadRequestException,
  UseInterceptors,
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
import { GetSharedDepartmentFAQsUseCase } from '../../application/use-cases/get-shared-department-faqs.use-case';
import {
  CreateQuestionInputDto,
  UpdateQuestionInputDto,
  GetQuestionOutputDto,
  DeleteManyQuestionsInputDto,
} from './dto';
import { Question } from '../../domain/entities/question.entity';
import { ViewFaqsDto } from './dto/view-faqs.dto';
import { GetSharedDepartmentFaqsDto } from './dto/get-shared-department-faqs.dto';
import { ViewFaqsUseCase } from 'src/questions/application/use-cases/view-faqs.use-case';
import { GuestAuth } from 'src/auth/guest/infrastructure/decorators/guest-auth.decorator';
import { GuestIdInterceptor } from 'src/shared/interceptors/guest-id.interceptor';
import { RecordInteractionDto } from './dto/record-interaction.dto';
import { EmployeePermissions } from 'src/rbac/decorators';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

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
    private readonly getSharedDepartmentFAQsUseCase: GetSharedDepartmentFAQsUseCase,
  ) {}

  @Get('view')
  @UseInterceptors(GuestIdInterceptor)
  async viewFaqs(@Query() query: ViewFaqsDto, @Req() req: any): Promise<any> {
    return this.viewFaqsUseCase.execute({ ...query, guestId: req.guest?.id });
  }

  @Get('shared')
  @UseInterceptors(GuestIdInterceptor)
  async getSharedDepartmentFaqs(
    @Query() query: GetSharedDepartmentFaqsDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.id || req.guest?.id;
    return this.getSharedDepartmentFAQsUseCase.execute({
      key: query.key,
      guestId: userId,
      subDepartmentId: query.subDepartmentId,
    });
  }

  @UseInterceptors(GuestIdInterceptor)
  @Post(':type/:faqId')
  async recordInteraction(
    @Param() params: RecordInteractionDto,
    @Req() req: any,
  ) {
    const { faqId } = params;
    const userId = req.user?.id || req.guest?.id;
    const handlers: Record<string, () => Promise<any>> = {
      satisfaction: () =>
        this.recordRatingUseCase.execute({
          guestId: userId,
          faqId,
          satisfactionType: 'satisfied',
        }),
      dissatisfaction: () =>
        this.recordRatingUseCase.execute({
          guestId: userId,
          faqId,
          satisfactionType: 'dissatisfied',
        }),
      view: () =>
        this.recordViewUseCase.execute({
          guestId: userId,
          faqId,
        }),
    };

    const handler = handlers[params.type];
    if (!handler) {
      throw new BadRequestException({
        details: [{ field: 'type', message: 'Invalid interaction type' }],
      });
    }

    return handler();
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Get('grouped')
  async getAllGroupedByDepartment(@Req() req: any): Promise<any> {
    return this.getAllGroupedByDepartmentUseCase.execute({
      userId: req.user.id,
      role: req.user.role,
    });
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Post()
  async create(
    @Body() input: CreateQuestionInputDto,
    @Req() req: any,
  ): Promise<{ question: Question; uploadKey: string }> {
    return this.createUseCase.execute({ ...input, creatorId: req.user.id });
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Put(':id')
  async update(
    @Body() dto: UpdateQuestionInputDto,
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ question: Question; uploadKey?: string }> {
    return this.updateUseCase.execute(id, { ...dto, userId: req.user.id });
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Get(':id')
  async get(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{
    question: Question;
    attachments: { [questionId: string]: string[] };
  }> {
    return this.getUseCase.execute(id, req.user.id);
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Get()
  async getAll(
    @Query('departmentId') departmentId: string,
    @Req() req: any,
  ): Promise<{
    questions: Question[];
    attachments: { [questionId: string]: string[] };
  }> {
    return this.getAllUseCase
      .execute(departmentId, req.user.id)
      .then((qs) => qs);
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetQuestionOutputDto | null> {
    return this.deleteUseCase.execute(id, req.user.id);
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyQuestionsInputDto,
    @Req() req: any,
  ): Promise<Question[]> {
    return this.deleteManyUseCase.execute(input.ids, req.user.id);
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Get('count')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}

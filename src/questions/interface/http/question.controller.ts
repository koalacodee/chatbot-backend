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
import { GetSharedDepartmentFAQsUseCase } from '../../application/use-cases/get-shared-department-faqs.use-case';
import {
  CreateQuestionInputDto,
  UpdateQuestionInputDto,
  GetQuestionOutputDto,
  DeleteManyQuestionsInputDto,
} from './dto';
import { Question } from '../../domain/entities/question.entity';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { Roles } from 'src/shared/value-objects/role.vo';
import { ViewFaqsDto } from './dto/view-faqs.dto';
import { GetSharedDepartmentFaqsDto } from './dto/get-shared-department-faqs.dto';
import { ViewFaqsUseCase } from 'src/questions/application/use-cases/view-faqs.use-case';
import { GuestAuth } from 'src/auth/guest/infrastructure/decorators/guest-auth.decorator';
import { RecordInteractionDto } from './dto/record-interaction.dto';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
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
  @GuestAuth()
  async viewFaqs(@Query() query: ViewFaqsDto, @Req() req: any): Promise<any> {
    return this.viewFaqsUseCase.execute({ ...query, guestId: req.user.id });
  }

  @Get('shared')
  @GuestAuth()
  async getSharedDepartmentFaqs(
    @Query() query: GetSharedDepartmentFaqsDto,
    @Req() req: any,
  ): Promise<any> {
    return this.getSharedDepartmentFAQsUseCase.execute({
      key: query.key,
      guestId: req.user.id,
      subDepartmentId: query.subDepartmentId,
    });
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
  ): Promise<Question> {
    return this.updateUseCase.execute(id, { ...dto, userId: req.user.id });
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Get(':id')
  async get(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetQuestionOutputDto | null> {
    return this.getUseCase.execute(id, req.user.id);
  }

  @EmployeePermissions(EmployeePermissionsEnum.ADD_FAQS)
  @Get()
  async getAll(
    @Query('departmentId') departmentId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.getAllUseCase
      .execute(departmentId, req.user.id)
      .then((qs) => qs.map((qs) => qs.toJSON()));
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

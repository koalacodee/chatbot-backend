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
  CreateSupportTicketUseCase,
  GetSupportTicketUseCase,
  GetAllSupportTicketsUseCase,
  UpdateSupportTicketUseCase,
  DeleteSupportTicketUseCase,
  CountSupportTicketsUseCase,
  AssignTicketUseCase,
  CloseTicketUseCase,
  ReopenTicketUseCase,
  ReplyToTicketUseCase,
  MarkTicketAsSeenUseCase,
  SearchTicketsUseCase,
  CountOpenTicketsUseCase,
  CountAnsweredPendingUseCase,
  GetFrequentTicketSubjectsUseCase,
  TrackTicketUseCase,
} from '../../application/use-cases';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';
import { AnswerTicketDto } from './dto/answer-ticket.use-case';
import { AnswerTicketUseCase } from 'src/support-tickets/application/use-cases/answer-ticket.use-case';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { GuestAuth } from 'src/auth/guest/infrastructure/decorators/guest-auth.decorator';
import { TrackTicketDto } from './dto/track-ticket.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

interface UpdateSupportTicketDto {
  id: string;
  subject?: string;
  description?: string;
  departmentId?: string;
  status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED';
}

interface AssignTicketDto {
  userId: string;
}

interface ReplyToTicketDto {
  reply: string;
  promoteToFaq?: true;
  newFawDepartmentId?: string;
}

interface SearchTicketsDto {
  name?: string;
  id?: string;
  phone?: string;
  employeeId?: string;
}

@Controller('support-tickets')
export class SupportTicketController {
  constructor(
    private readonly createUseCase: CreateSupportTicketUseCase,
    private readonly getUseCase: GetSupportTicketUseCase,
    private readonly getAllUseCase: GetAllSupportTicketsUseCase,
    private readonly updateUseCase: UpdateSupportTicketUseCase,
    private readonly deleteUseCase: DeleteSupportTicketUseCase,
    private readonly countUseCase: CountSupportTicketsUseCase,
    private readonly assignTicketUseCase: AssignTicketUseCase,
    private readonly closeTicketUseCase: CloseTicketUseCase,
    private readonly reopenTicketUseCase: ReopenTicketUseCase,
    private readonly replyToTicketUseCase: ReplyToTicketUseCase,
    private readonly markTicketAsSeenUseCase: MarkTicketAsSeenUseCase,
    private readonly searchTicketsUseCase: SearchTicketsUseCase,
    private readonly countOpenTicketsUseCase: CountOpenTicketsUseCase,
    private readonly countAnsweredPendingUseCase: CountAnsweredPendingUseCase,
    private readonly getFrequentTicketSubjectsUseCase: GetFrequentTicketSubjectsUseCase,
    private readonly answerTicketUseCase: AnswerTicketUseCase,
    private readonly trackTicketUseCase: TrackTicketUseCase,
  ) {}

  @GuestAuth()
  @Post()
  async create(
    @Body() dto: CreateSupportTicketDto,
    @Req() req: any,
  ): Promise<SupportTicket> {
    return this.createUseCase.execute({
      guestId: req.user?.id,
      subject: dto.subject,
      description: dto.description,
      departmentId: dto.departmentId,
    });
  }

  @GuestAuth()
  @Get('track/:code')
  async track(
    @Param() params: TrackTicketDto,
    @Req() req: any,
  ): Promise<SupportTicket> {
    return this.trackTicketUseCase.execute({
      code: params.code,
      guestId: req.user?.id,
    });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Get(':id')
  async get(@Param('id') id: string): Promise<SupportTicket> {
    return this.getUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Get()
  async getAll(
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ): Promise<SupportTicket[]> {
    return this.getAllUseCase.execute(
      offset ? parseInt(offset, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Put()
  async update(@Body() dto: UpdateSupportTicketDto): Promise<SupportTicket> {
    const { id, ...updateData } = dto;
    return this.updateUseCase.execute(id, updateData);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Put(':id/answer')
  async answerTicket(
    @Body() dto: AnswerTicketDto,
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<SupportTicketAnswer> {
    return this.answerTicketUseCase.execute({
      ticketId: id,
      content: dto.content,
      userId: req.user.id,
      userRole: req.user.role,
    });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<SupportTicket | null> {
    return this.deleteUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Get('count/all')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post(':id/assign')
  async assign(
    @Param('id') ticketId: string,
    @Body() dto: AssignTicketDto,
  ): Promise<void> {
    return this.assignTicketUseCase.execute({ ticketId, userId: dto.userId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Put(':id/close')
  async close(@Param('id') ticketId: string): Promise<void> {
    return this.closeTicketUseCase.execute({ ticketId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Put(':id/reopen')
  async reopen(@Param('id') ticketId: string): Promise<void> {
    return this.reopenTicketUseCase.execute({ ticketId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Post(':id/reply')
  async reply(
    @Param('id') ticketId: string,
    @Body() dto: ReplyToTicketDto,
    @Req() req: any,
  ): Promise<void> {
    return this.replyToTicketUseCase.execute({
      ticketId,
      reply: dto.reply,
      promoteToFaq: dto.promoteToFaq,
      newFawDepartmentId: dto.newFawDepartmentId,
      userId: req.user.id,
    });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Post(':id/mark-seen')
  async markAsSeen(@Param('id') ticketId: string): Promise<void> {
    return this.markTicketAsSeenUseCase.execute({ ticketId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Get('search')
  async search(@Query() query: SearchTicketsDto): Promise<any> {
    return this.searchTicketsUseCase.execute(query);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('count/open')
  async countOpen(): Promise<number> {
    return this.countOpenTicketsUseCase.execute();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('count/answered-pending')
  async countAnsweredPending(): Promise<number> {
    return this.countAnsweredPendingUseCase.execute();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('frequent-subjects')
  async getFrequentSubjects(): Promise<any> {
    return this.getFrequentTicketSubjectsUseCase.execute({ limit: 10 });
  }
}

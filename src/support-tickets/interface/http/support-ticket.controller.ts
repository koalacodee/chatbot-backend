import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
  RecordSupportTicketInteractionUseCase,
  GetGuestTicketsWithDetailsUseCase,
} from '../../application/use-cases';
import { GetEmployeesWithTicketHandlingPermissionsUseCase } from '../../application/use-cases/get-employees-with-ticket-handling-permissions.use-case';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { AnswerTicketDto } from './dto/answer-ticket.use-case';
import { AnswerTicketUseCase } from 'src/support-tickets/application/use-cases/answer-ticket.use-case';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { GuestAuth } from 'src/auth/guest/infrastructure/decorators/guest-auth.decorator';
import { TrackTicketDto } from './dto/track-ticket.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { RecordTicketInteractionDto } from './dto/record-ticket-interaction.dto';
import { GetGuestTicketsWithDetailsDto } from './dto/get-guest-tickets-with-details.dto';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { EmployeePermissionsEnum as EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

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
    private readonly recordInteractionUseCase: RecordSupportTicketInteractionUseCase,
    private readonly getGuestTicketsWithDetailsUseCase: GetGuestTicketsWithDetailsUseCase,
    private readonly getEmployeesWithTicketHandlingPermissionsUseCase: GetEmployeesWithTicketHandlingPermissionsUseCase,
  ) {}

  @GuestAuth()
  @Post(':type/:ticketId')
  async recordInteraction(
    @Param() params: RecordTicketInteractionDto,
    @Req() req: any,
  ) {
    return this.recordInteractionUseCase.execute({
      guestId: req.user.id,
      supportTicketId: params.ticketId,
      type: params.type,
    });
  }

  @GuestAuth()
  @Get('my-tickets')
  async getGuestTicketsWithDetails(
    @Query() query: GetGuestTicketsWithDetailsDto,
    @Req() req: any,
  ) {
    return this.getGuestTicketsWithDetailsUseCase.execute({
      guestId: req.user.id,
      offset: query.offset,
      limit: query.limit,
    });
  }

  @GuestAuth()
  @Post()
  async create(
    @Body() dto: CreateSupportTicketDto,
    @Req() req: any,
  ): Promise<{ ticket: SupportTicket; uploadKey?: string }> {
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

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TICKETS)
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any): Promise<SupportTicket> {
    return this.getUseCase.execute(id, req.user.id);
  }

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TICKETS)
  @Get()
  async getAll(
    @Req() req: any,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ): Promise<SupportTicket[]> {
    return this.getAllUseCase.execute(
      offset ? parseInt(offset, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      req.user.id,
    );
  }

  // @UseGuards(UserJwtAuthGuard, RolesGuard)
  // @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  // @Put()
  // async update(@Body() dto: UpdateSupportTicketDto): Promise<SupportTicket> {
  //   const { id, ...updateData } = dto;
  //   return this.updateUseCase.execute(id, updateData);
  // }

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TICKETS)
  @Put(':id/answer')
  async answerTicket(
    @Body() dto: AnswerTicketDto,
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ answer: SupportTicketAnswer; uploadKey?: string }> {
    return this.answerTicketUseCase.execute({
      ticketId: id,
      content: dto.content,
      attach: dto.attach,
      userId: req.user.id,
      userRole: req.user.role,
    });
  }

  @SupervisorPermissions()
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<SupportTicket | null> {
    return this.deleteUseCase.execute(id, req.user.id);
  }

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TICKETS)
  @Get('count/all')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }

  @SupervisorPermissions()
  @Post(':id/assign')
  async assign(
    @Param('id') ticketId: string,
    @Body() dto: AssignTicketDto,
    @Req() req: any,
  ): Promise<void> {
    return this.assignTicketUseCase.execute({
      ticketId,
      userId: dto.userId,
      currentUserId: req.user.id,
    });
  }

  @SupervisorPermissions()
  @Put(':id/close')
  async close(@Param('id') ticketId: string, @Req() req: any): Promise<void> {
    return this.closeTicketUseCase.execute({ ticketId, userId: req.user.id });
  }

  @SupervisorPermissions()
  @Put(':id/reopen')
  async reopen(@Param('id') ticketId: string, @Req() req: any): Promise<void> {
    return this.reopenTicketUseCase.execute({ ticketId, userId: req.user.id });
  }

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TICKETS)
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

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TICKETS)
  @Post(':id/mark-seen')
  async markAsSeen(
    @Param('id') ticketId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.markTicketAsSeenUseCase.execute({
      ticketId,
      userId: req.user.id,
    });
  }

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TICKETS)
  @Get('search')
  async search(@Query() query: SearchTicketsDto): Promise<any> {
    return this.searchTicketsUseCase.execute(query);
  }

  @SupervisorPermissions()
  @Get('count/open')
  async countOpen(): Promise<number> {
    return this.countOpenTicketsUseCase.execute();
  }

  @SupervisorPermissions()
  @Get('count/answered-pending')
  async countAnsweredPending(): Promise<number> {
    return this.countAnsweredPendingUseCase.execute();
  }

  @SupervisorPermissions()
  @Get('frequent-subjects')
  async getFrequentSubjects(): Promise<any> {
    return this.getFrequentTicketSubjectsUseCase.execute({ limit: 10 });
  }

  @SupervisorPermissions()
  @Get('employees/ticket-handlers')
  async getEmployeesWithTicketHandlingPermissions(
    @Req() req: any,
  ): Promise<any> {
    return this.getEmployeesWithTicketHandlingPermissionsUseCase.execute(
      req.user.id,
    );
  }
}

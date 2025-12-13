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
  UseInterceptors,
} from '@nestjs/common';
import {
  GetSupportTicketUseCase,
  GetAllSupportTicketsUseCase,
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
  ExportSupportTicketsUseCase,
} from '../../application/use-cases';
import { CreateSupportTicketWithVerificationUseCase } from '../../application/use-cases/create-support-ticket-with-verification.use-case';
import { VerifySupportTicketUseCase } from '../../application/use-cases/verify-support-ticket.use-case';
import { GetEmployeesWithTicketHandlingPermissionsUseCase } from '../../application/use-cases/get-employees-with-ticket-handling-permissions.use-case';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../domain/entities/support-ticket.entity';
import { AnswerSupportTicketDto } from './dto/answer-ticket.use-case';
import { AnswerTicketUseCase } from 'src/support-tickets/application/use-cases/answer-ticket.use-case';
import { TrackTicketDto } from './dto/track-ticket.dto';
import { TrackTicketOutput } from '../../application/use-cases/track-ticket.use-case';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { RecordTicketInteractionDto } from './dto/record-ticket-interaction.dto';
import { GetGuestTicketsWithDetailsDto } from './dto/get-guest-tickets-with-details.dto';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { EmployeePermissionsEnum as EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { GuestIdInterceptor } from 'src/shared/interceptors/guest-id.interceptor';
import { VerifyCodeDto } from 'src/auth/guest/interface/dto';
import { SupportTicketMetrics } from 'src/support-tickets/domain/repositories/support-ticket.repository';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';

import { ExportFileService } from 'src/export/domain/services/export-file.service';
import { ExportTicketsDto } from './dto/export-tickets.dto';
import { GetAllSupportTicketsDto } from './dto/get-all-support-tickets.dto';

interface AssignTicketDto {
  userId: string;
}

interface ReplyToTicketDto {
  reply: string;
  promoteToFaq?: true;
  newFawDepartmentId?: string;
  chooseAttachments?: string[];
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
    private readonly createWithVerificationUseCase: CreateSupportTicketWithVerificationUseCase,
    private readonly verifyTicketUseCase: VerifySupportTicketUseCase,
    private readonly getUseCase: GetSupportTicketUseCase,
    private readonly getAllUseCase: GetAllSupportTicketsUseCase,
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
    private readonly exportSupportTicketsUseCase: ExportSupportTicketsUseCase,
    private readonly exportFileService: ExportFileService,
  ) {}

  @UseInterceptors(GuestIdInterceptor)
  @Post(':type/:ticketId')
  async recordInteraction(
    @Param() params: RecordTicketInteractionDto,
    @Req() req: any,
  ) {
    return this.recordInteractionUseCase.execute({
      guestId: req.guest.id,
      supportTicketId: params.ticketId,
      type: params.type,
    });
  }

  @UseInterceptors(GuestIdInterceptor)
  @Get('my-tickets')
  async getGuestTicketsWithDetails(
    @Query() query: GetGuestTicketsWithDetailsDto,
  ) {
    return this.getGuestTicketsWithDetailsUseCase.execute({
      phone: query.phone,
      offset: query.offset,
      limit: query.limit,
    });
  }

  @UseInterceptors(GuestIdInterceptor)
  @Post()
  async createWithVerification(
    @Body() dto: CreateSupportTicketDto,
    @Req() req: any,
  ): Promise<{
    message: string;
    ticketId: string;
    verificationEmailSent: boolean;
  }> {
    return this.createWithVerificationUseCase.execute({
      subject: dto.subject,
      description: dto.description,
      departmentId: dto.departmentId,
      guestName: dto.guestName,
      guestPhone: dto.guestPhone,
      guestEmail: dto.guestEmail,
      attach: dto.attach,
      // guestId: req.guest?.id,
    });
  }

  @Post('verify')
  async verifyTicket(
    @Body() body: VerifyCodeDto,
  ): Promise<{ ticket: SupportTicket; message: string; uploadKey?: string }> {
    return this.verifyTicketUseCase.execute({ verificationCode: body.code });
  }

  @UseInterceptors(GuestIdInterceptor)
  @Get('track/:code')
  async track(
    @Param() params: TrackTicketDto,
    @Req() req: any,
  ): Promise<TrackTicketOutput> {
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
  async getAll(@Req() req: any, @Query() query: GetAllSupportTicketsDto) {
    return this.getAllUseCase.execute({
      offset: query.offset,
      limit: query.limit,
      userId: req.user.id,
      userRole: req.user.role,
      status: query.status,
      departmentId: query.departmentId,
      search: query.search,
    });
  }

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TICKETS)
  @Put(':id/answer')
  async answerTicket(
    @Body() dto: AnswerSupportTicketDto,
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ answer: unknown; uploadKey?: string }> {
    return this.answerTicketUseCase.execute({
      ticketId: id,
      content: dto.content,
      attach: dto.attach,
      userId: req.user.id,
      userRole: req.user.role,
      chooseAttachments: dto.chooseAttachments,
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
  ): Promise<{ uploadKey?: string }> {
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

  @AdminAuth()
  @Post('export')
  async exportTickets(@Body() body: ExportTicketsDto) {
    const exportEntity = await this.exportSupportTicketsUseCase.execute({
      start: body.start,
      end: body.end,
    });
    const { shareKey } = await this.exportFileService.genShareKey(
      exportEntity.id,
    );
    return { ...exportEntity.toJSON(), shareKey };
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

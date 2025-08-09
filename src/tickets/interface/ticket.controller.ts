import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateTicketUseCase } from '../application/use-cases/create-ticket.use-case';
import { TrackTicketUseCase } from '../application/use-cases/track-ticket.use-case';
import { AnswerTicketUseCase } from '../application/use-cases/answer-ticket.use-case';
import {
  CreateTicketDto,
  CreateTicketResponseDto,
} from './dtos/create-ticket.dto';
import {
  TrackTicketDto,
  TrackTicketResponseDto,
} from './dtos/track-ticket.dto';
import {
  AnswerTicketDto,
  AnswerTicketResponseDto,
} from './dtos/answer-ticket.dto';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/rbac/guards/roles.guard';
import { UseRoles } from 'src/rbac/decorators/roles.decorator';
import { Request } from 'express';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GuestInterceptor } from 'src/chat/infrastructure/interceptors/guest.interceptor';

@ApiTags('tickets')
@Controller('tickets')
export class TicketController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly trackTicketUseCase: TrackTicketUseCase,
    private readonly answerTicketUseCase: AnswerTicketUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
    type: CreateTicketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Department or user not found' })
  @UseGuards(JwtAuthGuard)
  async createTicket(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: any,
  ): Promise<CreateTicketResponseDto> {
    const user = req.user as any;

    return this.createTicketUseCase.execute({
      departmentId: createTicketDto.departmentId,
      question: createTicketDto.question,
      userId: user?.id,
    });
  }

  @Post('/guest')
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
    type: CreateTicketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Department or user not found' })
  // @UseGuards(JwtAuthGuard)
  @UseInterceptors(GuestInterceptor)
  async createTicketGuest(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: any,
  ): Promise<CreateTicketResponseDto> {
    const guest = req.guest as any;

    return this.createTicketUseCase.execute({
      departmentId: createTicketDto.departmentId,
      question: createTicketDto.question,
      guestId: guest?.id,
    });
  }

  @Get(':ticketCode')
  @ApiOperation({ summary: 'Track a ticket by code' })
  @ApiResponse({
    status: 200,
    description: 'Ticket details retrieved successfully',
    type: TrackTicketResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @UseGuards(JwtAuthGuard)
  async trackTicket(
    @Param('ticketCode') ticketCode: string,
    @Req() req: any,
  ): Promise<TrackTicketResponseDto> {
    const user = req.user as any;

    return this.trackTicketUseCase.execute({
      ticketCode,
      userId: user?.id,
    });
  }

  @Get(':ticketCode/guest')
  @ApiOperation({ summary: 'Track a ticket by code' })
  @ApiResponse({
    status: 200,
    description: 'Ticket details retrieved successfully',
    type: TrackTicketResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @UseInterceptors(GuestInterceptor)
  async trackTicketGuest(
    @Param('ticketCode') ticketCode: string,
    @Req() req: any,
  ): Promise<TrackTicketResponseDto> {
    const guest = req.guest as any;

    return this.trackTicketUseCase.execute({
      ticketCode,
      guestId: guest?.id,
    });
  }

  @Post(':ticketId/answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.MANAGER, Roles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Answer a ticket (Admin/Manager only)' })
  @ApiResponse({
    status: 201,
    description: 'Ticket answered successfully',
    type: AnswerTicketResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot answer auto-generated tickets',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 409, description: 'Ticket already has an answer' })
  async answerTicket(
    @Param('ticketId') ticketId: string,
    @Body() answerTicketDto: AnswerTicketDto,
    @Req() req: any,
  ): Promise<AnswerTicketResponseDto> {
    const user = req.user as any;

    return this.answerTicketUseCase.execute({
      ticketId,
      content: answerTicketDto.content,
      answeredBy: user?.id,
    });
  }
}

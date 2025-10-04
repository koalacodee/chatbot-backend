import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { GetSupervisorInvitationUseCase } from '../../application/use-cases/get-supervisor-invitation.use-case';
import { CompleteSupervisorInvitationUseCase } from '../../application/use-cases/complete-supervisor-invitation.use-case';
import { CompleteSupervisorInvitationDto } from './dtos/complete-supervisor-invitation.dto';
import { TokensService } from 'src/auth/domain/services/tokens.service';

interface GetInvitationQuery {
  token: string;
}

@Controller('supervisor/invitation')
export class SupervisorInvitationController {
  constructor(
    private readonly getSupervisorInvitationUseCase: GetSupervisorInvitationUseCase,
    private readonly completeSupervisorInvitationUseCase: CompleteSupervisorInvitationUseCase,
    private readonly jwtTokensService: TokensService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getInvitation(@Query() query: GetInvitationQuery): Promise<any> {
    const result = await this.getSupervisorInvitationUseCase.execute({
      token: query.token,
    });

    return result;
  }

  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  async completeInvitation(
    @Body() completeInvitationDto: CompleteSupervisorInvitationDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<any> {
    const result = await this.completeSupervisorInvitationUseCase.execute(
      completeInvitationDto,
    );

    // Set refresh token cookie
    this.jwtTokensService.setRefreshTokenCookie(res, result.refreshToken);

    return {
      message: 'Supervisor account created successfully',
      supervisor: result.supervisor.toJSON(),
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email.toString(),
        username: result.user.username,
        role: result.user.role.getRole(),
        employeeId: result.user.employeeId,
        jobTitle: result.user.jobTitle,
        profilePicture: result.user.profilePicture,
      },
      accessToken: result.accessToken,
      uploadKey: result.uploadKey,
      uploadKeyExpiresAt: result.uploadKeyExpiresAt,
    };
  }
}

import { Controller, Get, Query, HttpCode, HttpStatus, Delete, Param } from '@nestjs/common';
import { GetSupervisorInvitationsUseCase } from '../../application/use-cases/get-supervisor-invitations.use-case';
import { GetSupervisorInvitationsDto } from './dtos/get-supervisor-invitations.dto';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';
import { DeleteSupervisorInvitationUseCase } from '../../application/use-cases/delete-supervisor-invitation.use-case';

@Controller('supervisor/invitations')
export class SupervisorInvitationsController {
  constructor(
    private readonly getSupervisorInvitationsUseCase: GetSupervisorInvitationsUseCase,
    private readonly deleteSupervisorInvitationUseCase: DeleteSupervisorInvitationUseCase,
  ) { }

  @Get()
  @AdminAuth()
  @HttpCode(HttpStatus.OK)
  async getInvitations(
    @Query() query: GetSupervisorInvitationsDto,
  ): Promise<any> {
    const result = await this.getSupervisorInvitationsUseCase.execute({
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return result;
  }

  @Delete(':token')
  @AdminAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInvitation(@Param('token') token: string): Promise<void> {
    await this.deleteSupervisorInvitationUseCase.execute({ token });
  }
}

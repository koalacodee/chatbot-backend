import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { GetSupervisorInvitationsUseCase } from '../../application/use-cases/get-supervisor-invitations.use-case';
import { GetSupervisorInvitationsDto } from './dtos/get-supervisor-invitations.dto';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';

@Controller('supervisor/invitations')
export class SupervisorInvitationsController {
  constructor(
    private readonly getSupervisorInvitationsUseCase: GetSupervisorInvitationsUseCase,
  ) {}

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
}

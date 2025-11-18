import { Global, Module } from '@nestjs/common';
import { SupervisorRepository } from './domain/repository/supervisor.repository';
import { PrismaSupervisorRepository } from './infrastructure/repositories/prisma-supervisor.repository';
import { SupervisorController } from './interface/http/supervisor.controller';
import { SupervisorInvitationController } from './interface/http/supervisor-invitation.controller';
import { SupervisorInvitationsController } from './interface/http/supervisor-invitations.controller';
import { AddSupervisorByAdminUseCase } from './application/use-cases/add-supervisor-by-admin.use-case';
import { CompleteSupervisorInvitationUseCase } from './application/use-cases/complete-supervisor-invitation.use-case';
import { GetSupervisorInvitationUseCase } from './application/use-cases/get-supervisor-invitation.use-case';
import { GetSupervisorInvitationsUseCase } from './application/use-cases/get-supervisor-invitations.use-case';
import { CanDeleteUseCase } from './application/use-cases/can-delete.use-case';
import { DepartmentModule } from 'src/department/department.module';
import { SearchSupervisorUseCase } from './application/use-cases/search-supervisor.use-case';
import { UpdateSupervisorUseCase } from './application/use-cases/update-supervisor.use-case';
import { DeleteSupervisorUseCase } from './application/use-cases/delete-supervisor.use-case';
import { SupervisorInvitationService } from './infrastructure/services/supervisor-invitation.service';
import { ProfileModule } from 'src/profile/profile.module';
import { UserAuthModule } from 'src/auth/user/user.module';
import { GetSupervisorsSummaryUseCase } from './application/use-cases/get-supervisors-summary.use-case';
import { DelegateSupervisorUseCase } from './application/use-cases/delegate-supervisor.use-case';
import { DeleteSupervisorInvitationUseCase } from './application/use-cases/delete-supervisor-invitation.use-case';

@Global()
@Module({
  controllers: [
    SupervisorController,
    SupervisorInvitationController,
    SupervisorInvitationsController,
  ],
  providers: [
    { provide: SupervisorRepository, useClass: PrismaSupervisorRepository },
    CanDeleteUseCase,
    AddSupervisorByAdminUseCase,
    CompleteSupervisorInvitationUseCase,
    GetSupervisorInvitationUseCase,
    GetSupervisorInvitationsUseCase,
    SearchSupervisorUseCase,
    UpdateSupervisorUseCase,
    DeleteSupervisorUseCase,
    SupervisorInvitationService,
    GetSupervisorsSummaryUseCase,
    DelegateSupervisorUseCase,
    DeleteSupervisorInvitationUseCase,
  ],
  exports: [SupervisorRepository],
  imports: [DepartmentModule, ProfileModule, UserAuthModule],
})
export class SupervisorModule { }

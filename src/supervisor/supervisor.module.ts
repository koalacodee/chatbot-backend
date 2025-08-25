import { Global, Module } from '@nestjs/common';
import { SupervisorRepository } from './domain/repository/supervisor.repository';
import { PrismaSupervisorRepository } from './infrastructure/repositories/prisma-supervisor.repository';
import { SupervisorController } from './interface/http/supervisor.controller';
import { AddSupervisorByAdminUseCase } from './application/use-cases/add-supervisor-by-admin.use-case';
import { CanDeleteUseCase } from './application/use-cases/can-delete.use-case';
import { DepartmentModule } from 'src/department/department.module';
import { SearchSupervisorUseCase } from './application/use-cases/search-supervisor.use-case';
import { UpdateSupervisorUseCase } from './application/use-cases/update-supervisor.use-case';
import { DeleteSupervisorUseCase } from './application/use-cases/delete-supervisor.use-case';

@Global()
@Module({
  controllers: [SupervisorController],
  providers: [
    { provide: SupervisorRepository, useClass: PrismaSupervisorRepository },
    CanDeleteUseCase,
    AddSupervisorByAdminUseCase,
    SearchSupervisorUseCase,
    UpdateSupervisorUseCase,
    DeleteSupervisorUseCase,
  ],
  exports: [SupervisorRepository],
  imports: [DepartmentModule],
})
export class SupervisorModule {}

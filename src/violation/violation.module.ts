import { Module } from '@nestjs/common';
import { ViolationRepository } from './domain/repositories/violation.repository';
import { ViolationRuleRepository } from './domain/repositories/violation-rule.repository';
import { PrismaViolationRepository } from './infrastructure/repositories/prisma-violation.repository';
import { PrismaViolationRuleRepository } from './infrastructure/repositories/prisma-violation-rule.repository';
import { ViolationController } from './interface/http/violation.controller';
import {
  CreateViolationUseCase,
  DeleteViolationUseCase,
  GetViolationsUseCase,
  MarkViolationAsPaidUseCase,
  MarkViolationAsPendingUseCase,
} from './application/use-cases';
import { VehicleModule } from 'src/vehicle/vehicle.module';

@Module({
  controllers: [ViolationController],
  providers: [
    { provide: ViolationRepository, useClass: PrismaViolationRepository },
    {
      provide: ViolationRuleRepository,
      useClass: PrismaViolationRuleRepository,
    },
    CreateViolationUseCase,
    DeleteViolationUseCase,
    GetViolationsUseCase,
    MarkViolationAsPaidUseCase,
    MarkViolationAsPendingUseCase,
  ],
  exports: [ViolationRepository, ViolationRuleRepository],
  imports: [VehicleModule],
})
export class ViolationModule {}

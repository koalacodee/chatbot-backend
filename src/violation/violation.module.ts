import { Module } from '@nestjs/common';
import { ViolationRepository } from './domain/repositories/violation.repository';
import { ViolationRuleRepository } from './domain/repositories/violation-rule.repository';
import { DrizzleViolationRepository } from './infrastructure/repositories/drizzle-violation.repository';
import { DrizzleViolationRuleRepository } from './infrastructure/repositories/drizzle-violation-rule.repository';
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
    { provide: ViolationRepository, useClass: DrizzleViolationRepository },
    {
      provide: ViolationRuleRepository,
      useClass: DrizzleViolationRuleRepository,
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

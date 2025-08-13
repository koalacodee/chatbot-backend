import { Module } from '@nestjs/common';
import { ViolationRepository } from './domain/repositories/violation.repository';
import { ViolationRuleRepository } from './domain/repositories/violation-rule.repository';
import { PrismaViolationRepository } from './infrastructure/repositories/prisma-violation.repository';
import { PrismaViolationRuleRepository } from './infrastructure/repositories/prisma-violation-rule.repository';

@Module({
  providers: [
    { provide: ViolationRepository, useClass: PrismaViolationRepository },
    { provide: ViolationRuleRepository, useClass: PrismaViolationRuleRepository },
  ],
  exports: [ViolationRepository, ViolationRuleRepository],
})
export class ViolationModule {}

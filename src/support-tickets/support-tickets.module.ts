import { Module } from '@nestjs/common';
import { SupportTicketRepository } from './domain/repositories/support-ticket.repository';
import { PrismaSupportTicketRepository } from './infrastructure/repositories/prisma-support-ticket.repository';
import { SupportTicketAnswerRepository } from './domain/repositories/support-ticket-answer.repository';
import { PrismaSupportTicketAnswerRepository } from './infrastructure/repositories/prisma-support-ticket-answer.repository';
import { SupportTicketController } from './interface/http/support-ticket.controller';
import * as UseCases from './application/use-cases';
import { DepartmentModule } from 'src/department/department.module';
import { PrismaSupportTicketInteractionRepository } from './infrastructure/repositories/prisma-support-ticket-interaction.repository';
import { SupportTicketInteractionRepository } from './domain/repositories/support-ticket-interaction.repository';

@Module({
  controllers: [SupportTicketController],
  providers: [
    {
      provide: SupportTicketRepository,
      useClass: PrismaSupportTicketRepository,
    },
    {
      provide: SupportTicketAnswerRepository,
      useClass: PrismaSupportTicketAnswerRepository,
    },
    {
      provide: SupportTicketInteractionRepository,
      useClass: PrismaSupportTicketInteractionRepository,
    },
    ...Object.values(UseCases),
  ],
  exports: [SupportTicketRepository, SupportTicketAnswerRepository],
  imports: [DepartmentModule],
})
export class SupportTicketModule {}

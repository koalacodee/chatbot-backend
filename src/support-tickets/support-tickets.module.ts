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
import { TicketAnsweredListener } from './application/listeners/ticket-answered.listener';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { TicketInteractedListener } from './application/listeners/ticket-interacted.listener';
import { RedisTicketStorageService } from './infrastructure/services/redis-ticket-storage.service';
import { ExportModule } from 'src/export/export.module';

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
    RedisTicketStorageService,
    ...Object.values(UseCases),
    TicketAnsweredListener,
    TicketInteractedListener,
  ],
  exports: [SupportTicketRepository, SupportTicketAnswerRepository],
  imports: [DepartmentModule, ActivityLogModule, ExportModule],
})
export class SupportTicketModule { }

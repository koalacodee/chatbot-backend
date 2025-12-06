import { Module } from '@nestjs/common';
import { SupportTicketRepository } from './domain/repositories/support-ticket.repository';
import { DrizzleSupportTicketRepository } from './infrastructure/repositories/drizzle/drizzle-support-ticket.repository';
import { SupportTicketAnswerRepository } from './domain/repositories/support-ticket-answer.repository';
import { DrizzleSupportTicketAnswerRepository } from './infrastructure/repositories/drizzle/drizzle-support-ticket-answer.repository';
import { SupportTicketController } from './interface/http/support-ticket.controller';
import * as UseCases from './application/use-cases';
import { DepartmentModule } from 'src/department/department.module';
import { DrizzleSupportTicketInteractionRepository } from './infrastructure/repositories/drizzle/drizzle-support-ticket-interaction.repository';
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
      useClass: DrizzleSupportTicketRepository,
    },
    {
      provide: SupportTicketAnswerRepository,
      useClass: DrizzleSupportTicketAnswerRepository,
    },
    {
      provide: SupportTicketInteractionRepository,
      useClass: DrizzleSupportTicketInteractionRepository,
    },
    RedisTicketStorageService,
    ...Object.values(UseCases),
    TicketAnsweredListener,
    TicketInteractedListener,
  ],
  exports: [SupportTicketRepository, SupportTicketAnswerRepository],
  imports: [DepartmentModule, ActivityLogModule, ExportModule],
})
export class SupportTicketModule {}

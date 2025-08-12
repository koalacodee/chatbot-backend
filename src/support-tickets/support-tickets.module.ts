import { Module } from '@nestjs/common';
import { SupportTicketRepository } from './domain/repositories/support-ticket.repository';
import { PrismaSupportTicketRepository } from './infrastructure/repositories/prisma-support-ticket.repository';
import { SupportTicketAnswerRepository } from './domain/repositories/support-ticket-answer.repository';
import { PrismaSupportTicketAnswerRepository } from './infrastructure/repositories/prisma-support-ticket-answer.repository';

@Module({
  providers: [
    {
      provide: SupportTicketRepository,
      useClass: PrismaSupportTicketRepository,
    },
    {
      provide: SupportTicketAnswerRepository,
      useClass: PrismaSupportTicketAnswerRepository,
    },
  ],
})
export class SupportTicketModule {}

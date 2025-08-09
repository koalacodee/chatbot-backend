import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TicketRepository } from './domain/repositories/ticket.repository';
import { PrismaTicketRepository } from './infrastructure/repositories/prisma-ticket.repository';
import { ClassifierService } from './domain/classifier/classifier-service.interface';
import { BartClassifierService } from './infrastructure/classifier/bart.classifier-service';
import { CreateTicketListener } from './application/listeners/create-ticket.listener';
import { DepartmentModule } from 'src/department/department.module';
import { PushManagerModule } from 'src/common/push-manager';
import { AnswerTicketListener } from './application/listeners/answer-ticket.listener';
import { KnowledgeChunkModule } from 'src/knowledge-chunks/knowledge-chunk.module';
import { CreateTicketUseCase } from './application/use-cases/create-ticket.use-case';
import { AnswerTicketUseCase } from './application/use-cases/answer-ticket.use-case';
import { TrackTicketUseCase } from './application/use-cases/track-ticket.use-case';
import { PrismaAnswerRepository } from './infrastructure/repositories';
import { AnswerRepository } from './domain/repositories/answer.repository';
import { TicketController } from './interface/ticket.controller';

@Module({
  imports: [
    PrismaModule,
    DepartmentModule,
    PushManagerModule,
    KnowledgeChunkModule,
  ],
  providers: [
    {
      provide: TicketRepository,
      useClass: PrismaTicketRepository,
    },
    {
      provide: ClassifierService,
      useClass: BartClassifierService,
    },
    {
      provide: AnswerRepository,
      useClass: PrismaAnswerRepository,
    },
    CreateTicketListener,
    AnswerTicketListener,
    CreateTicketUseCase,
    AnswerTicketUseCase,
    TrackTicketUseCase,
  ],
  exports: [TicketRepository],
  controllers: [TicketController],
})
export class TicketModule {}

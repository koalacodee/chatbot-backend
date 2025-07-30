import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TicketRepository } from './domain/repositories/ticket.repository';
import { PrismaTicketRepository } from './infrastructure/repositories/prisma-ticket.repository';
import { ClassifierService } from './domain/classifier/classifier-service.interface';
import { BartClassifierService } from './infrastructure/classifier/bart.classifier-service';
import { CreateTicketListener } from './application/listeners/create-ticket.listener';
import { DepartmentModule } from 'src/department/department.module';

@Module({
  imports: [PrismaModule, DepartmentModule],
  providers: [
    {
      provide: TicketRepository,
      useClass: PrismaTicketRepository,
    },
    {
      provide: ClassifierService,
      useClass: BartClassifierService,
    },
    CreateTicketListener,
  ],
  exports: [TicketRepository],
})
export class TicketModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RbacModule } from './rbac';
import { UsersModule } from './users/users.module';
import { BullModule } from '@nestjs/bullmq';
import { DepartmentModule } from './department/department.module';
import { QdrantModule } from './common/qdrant/qdrant.module';
import { KnowledgeChunkModule } from './knowledge-chunks/knowledge-chunk.module';
import { ChatModule } from './chat/chat.module';
import { TicketModule } from './tickets/ticket.module';
import { PushManagerModule } from './common/push-manager/push-manager.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { QuestionModule } from './questions/question.module';
import { SupportTicketModule } from './support-tickets/support-tickets.module';
import { GuestModule } from './guest/guest.module';
import { TaskModule } from './task/task.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          port: config.get('REDIS_PORT'),
          host: config.get('REDIS_HOST'),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),
    EventEmitterModule.forRoot(),
    SharedModule,
    AuthModule,
    PrismaModule,
    RbacModule,
    UsersModule,
    DepartmentModule,
    QdrantModule,
    KnowledgeChunkModule,
    ChatModule,
    TicketModule,
    PushManagerModule,
    QuestionModule,
    SupportTicketModule,
    GuestModule,
    TaskModule,
  ],
})
export class AppModule {}

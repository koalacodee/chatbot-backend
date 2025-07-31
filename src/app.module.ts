import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            limit: configService.get<number>('THROTTLER_LIMIT'),
            ttl: configService.get<number>('THROTTLER_TTL'),
          },
        ],
      }),
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
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

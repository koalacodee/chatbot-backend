import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RbacModule } from './rbac';
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
import { VehicleLicenseModule } from './vehicle-license/vehicle-license.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { ViolationModule } from './violation/violation.module';
import { PromotionModule } from './promotion/promotion.module';
import { FileModule } from './files/files.module';
import { AdminModule } from './admin/admin.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { EmployeeModule } from './employee/employee.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { DriverModule } from './driver/driver.module';
import { EmployeeRequestModule } from './employee-request/employee-request.module';
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AttachmentGroupModule } from './attachment-group/attachment-group.module';
import { TranslationModule } from './translation/translation.module';
import { DrizzleModule } from './common/drizzle/drizzle.module';
import { FilehubModule } from './filehub/filehub.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          port: config.getOrThrow('REDIS_PORT'),
          host: config.getOrThrow('REDIS_HOST'),
          password: config.get('REDIS_PASSWORD'),
          username: config.get('REDIS_USER'),
          family: parseInt(config.get('REDIS_IP_FAMILY', '4')),
        },
      }),
    }),
    EventEmitterModule.forRoot(),
    SharedModule,
    AuthModule,
    PrismaModule,
    DrizzleModule,
    RbacModule,
    DepartmentModule,
    QdrantModule,
    KnowledgeChunkModule,
    ChatModule,
    // TicketModule,
    PushManagerModule,
    QuestionModule,
    SupportTicketModule,
    GuestModule,
    TaskModule,
    VehicleLicenseModule,
    VehicleModule,
    ViolationModule,
    PromotionModule,
    FileModule,
    AdminModule,
    SupervisorModule,
    EmployeeModule,
    ActivityLogModule,
    DriverModule,
    EmployeeRequestModule,
    NotificationModule,
    DashboardModule,
    AttachmentGroupModule,
    TranslationModule,
    FilehubModule,
  ],
})
export class AppModule { }

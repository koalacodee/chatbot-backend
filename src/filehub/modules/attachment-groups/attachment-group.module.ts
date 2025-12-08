import { Global, Module } from '@nestjs/common';
import { DrizzleAttachmentGroupRepository } from './infrastructure/repositories/drizzle-attachment-group.repository';
import { AttachmentGroupRepository } from './domain/repositories/attachment-group.repository';
import { AttachmentGroupController } from './interface/http/attachment-group.controller';
import { AttachmentGroupGateway } from './interface/websocket/attachment-group.gateway';
import { CloseAttachmentGroupUseCase } from './application/use-cases/close-attachment-group.use-case';
import { CreateAttachmentGroupUseCase } from './application/use-cases/create-attachment-group.use-case';
import { DeleteAttachmentGroupUseCase } from './application/use-cases/delete-attachment-group.use-case';
import { GetAttachmentGroupByKeyUseCase } from './application/use-cases/get-attachment-group-by-key.use-case';
import { GetAttachmentGroupDetailsUseCase } from './application/use-cases/get-attachment-group-details.use-case';
import { GetMyAttachmentGroupsUseCase } from './application/use-cases/get-my-attachment-groups.use-case';
import { UpdateAttachmentGroupUseCase } from './application/use-cases/update-attachment-group.use-case';
import { MemberRepository } from './domain/repositories/member.repository';
import { DrizzleMemberRepository } from './infrastructure/repositories/drizzle-member.repository';
import { AttachmentGroupMemberGateway } from './interface/websocket/member.gateway';
import { GetAttachmentGroupByMemberIdUseCase } from './application/use-cases/get-attachment-group-by-member-id.use-case';
import { RequestMembershipUseCase } from './application/use-cases/request-membership.use-case';
import { VerifyMemberOtpUseCase } from './application/use-cases/verify-member-otp.use-case';
import { MemberJwtStrategy } from './interface/http/strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: AttachmentGroupRepository,
      useClass: DrizzleAttachmentGroupRepository,
    },
    AttachmentGroupGateway,
    CloseAttachmentGroupUseCase,
    CreateAttachmentGroupUseCase,
    DeleteAttachmentGroupUseCase,
    GetAttachmentGroupByKeyUseCase,
    GetAttachmentGroupDetailsUseCase,
    GetMyAttachmentGroupsUseCase,
    UpdateAttachmentGroupUseCase,
    {
      provide: MemberRepository,
      useClass: DrizzleMemberRepository,
    },
    AttachmentGroupMemberGateway,
    GetAttachmentGroupByMemberIdUseCase,
    RequestMembershipUseCase,
    VerifyMemberOtpUseCase,
    GetAttachmentGroupByMemberIdUseCase,
    MemberJwtStrategy,
  ],
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('ATTACHMENT_GROUP_MEMBER_ACCESS_TOKEN_SECRET'),
        signOptions: { expiresIn: '15d' },
      }),
    }),
  ],
  exports: [AttachmentGroupRepository],
  controllers: [AttachmentGroupController],
})
export class FileHubAttachmentGroupModule {}

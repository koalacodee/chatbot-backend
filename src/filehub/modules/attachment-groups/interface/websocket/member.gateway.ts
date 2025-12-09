import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { MemberRepository } from '../../domain/repositories/member.repository';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

@WebSocketGateway({
  namespace: '/filehub/members',
  cors: {
    origin: '*', // عدلها حسب الحاجة
  },
})
@Injectable()
export class AttachmentGroupMemberGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly attachmentGroupMembersRepo: MemberRepository,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AttachmentGroupMemberGateway.name);

  // socketId -> memberId
  private members = new Map<string, string>();

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    // console.log(client);
    if (this.members.has(client.id)) {
      this.members.delete(client.id);
      this.emitActiveMembers();
    }
  }

  @SubscribeMessage('otp_subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otp: string },
  ) {
    this.logger.log(`Client ${client.id} subscribed to OTP: ${data.otp}`);
    // this.otp_subscriptions.set(data.otp, client);
    client.join(String(data.otp));
  }

  @SubscribeMessage('otp_unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otp: string },
  ) {
    this.logger.log(`Client ${client.id} unsubscribed from OTP: ${data.otp}`);
    client.leave(String(data.otp));
  }

  @SubscribeMessage('member_subscribe')
  async handleMemberSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { memberId: string },
  ) {
    this.logger.log(
      `Client ${client.id} subscribed to Member: ${data.memberId}`,
    );
    const member = await this.attachmentGroupMembersRepo.findById(
      data.memberId,
    );
    if (member.attachmentGroupId.toString()) {
      client.join(`attachment-group::${member.attachmentGroupId.toString()}`);
      this.members.set(client.id, data.memberId);
      this.emitActiveMembers();
    }
  }

  @SubscribeMessage('active_members_sub')
  async handleActiveMembers(@ConnectedSocket() client: Socket) {
    const accessToken = client.handshake.auth.token;
    console.log(client.handshake);

    if (accessToken) {
      try {
        const payload = await this.jwtService
          .verifyAsync(accessToken, {
            secret: this.config.get('USER_ACCESS_TOKEN_SECRET'),
          })
          .catch((error) => {
            this.logger.error(error);
            client.emit('error', { message: 'Invalid access token' });
            return;
          });

        console.log(payload);

        if (payload.permissions) {
          if (
            payload.permissions.includes(
              SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS,
            ) ||
            payload.permissions.includes(
              EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS,
            ) ||
            payload.role == 'ADMIN'
          ) {
            client.join('active_members_sub');
            client.emit('active_members_update', {
              members: Array.from(this.members.values()),
            });
          } else {
            client.emit('error', { message: 'Unauthorized' });
            return;
          }
        }
      } catch (error) {
        client.emit('error', { message: 'Invalid access token' });
        return;
      }
    } else {
      client.emit('error', { message: 'Unauthorized' });
    }
  }

  @SubscribeMessage('member_unsubscribe')
  handleMemberUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { memberId: string },
  ) {
    this.logger.log(
      `Client ${client.id} unsubscribed from Member: ${data.memberId}`,
    );
    client.leave(data.memberId);
    this.members.delete(client.id);
    this.emitActiveMembers();
  }

  emitMemberAuthorize(otp: string, authOtp: string) {
    this.server.to(otp).emit('member_authorize', { otp: authOtp });
    this.logger.log(`Client ${otp} authorized with OTP: ${otp}`);
  }

  private emitActiveMembers() {
    this.server.to('active_members_sub').emit('active_members_update', {
      members: Array.from(this.members.values()),
    });
  }

  async notifyAttachmentsChange(
    attachmentGroupId: string,
    attachments: FilehubAttachmentMessage[],
  ) {
    return new Promise<void>(async (resolve) => {
      this.server
        .to(`attachment-group::${attachmentGroupId}`)
        .emit('attachments_change', { attachments });
      resolve();
    });
  }
}

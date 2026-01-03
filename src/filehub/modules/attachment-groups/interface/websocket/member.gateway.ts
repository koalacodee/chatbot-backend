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
    origin: '*',
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

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.emitActiveMembers();
  }

  @SubscribeMessage('otp_subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otp: string },
  ) {
    this.logger.log(`Client ${client.id} subscribed to OTP: ${data.otp}`);
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
    if (member?.attachmentGroupId) {
      client.join(`attachment-group::${member.attachmentGroupId.toString()}`);
      client.join(`member::${data.memberId}`);
      this.emitActiveMembers();
    }
  }

  @SubscribeMessage('active_members_sub')
  async handleActiveMembers(@ConnectedSocket() client: Socket) {
    const accessToken = client.handshake.auth.token;

    if (!accessToken) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(accessToken, {
        secret: this.config.get('USER_ACCESS_TOKEN_SECRET'),
      });

      // Check token expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        client.emit('error', { message: 'Token expired' });
        client.disconnect();
        return;
      }

      if (payload.permissions) {
        if (
          payload.permissions.includes(
            SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS,
          ) ||
          payload.permissions.includes(
            EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS,
          ) ||
          payload.role === 'ADMIN'
        ) {
          client.join('active_members_sub');
          // Use the new room-based approach
          const memberIds = await this.getActiveMemberIds();
          client.emit('active_members_update', {
            members: memberIds,
          });
        } else {
          client.emit('error', { message: 'Unauthorized' });
        }
      }
    } catch (error) {
      this.logger.error(error);
      client.emit('error', { message: 'Invalid access token' });
      client.disconnect();
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
    client.leave(`member::${data.memberId}`);
    this.emitActiveMembers();
  }

  emitMemberAuthorize(otp: string, authOtp: string) {
    this.server.to(otp).emit('member_authorize', { otp: authOtp });
    this.logger.log(`Client ${otp} authorized with OTP: ${otp}`);
  }

  private async getActiveMemberIds(): Promise<string[]> {
    const rooms = Array.from(this.server.sockets.adapter.rooms.keys());
    const memberRooms = rooms.filter((room) => room.startsWith('member::'));
    const memberIds = memberRooms.map((room) => room.replace('member::', ''));
    return [...new Set(memberIds)];
  }

  private async emitActiveMembers() {
    const uniqueMembers = await this.getActiveMemberIds();
    this.server.to('active_members_sub').emit('active_members_update', {
      members: uniqueMembers,
    });
  }

  async notifyAttachmentsChange(
    attachmentGroupId: string,
    attachments: FilehubAttachmentMessage[],
  ) {
    this.server
      .to(`attachment-group::${attachmentGroupId}`)
      .emit('attachments_change', { attachments });
  }
}

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
  constructor(private readonly attachmentGroupMembersRepo: MemberRepository) {}
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AttachmentGroupMemberGateway.name);

  // OTP -> socketIds
  private readonly otp_subscriptions: Map<string, string> = new Map();

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('otp_subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otp: string },
  ) {
    this.logger.log(`Client ${client.id} subscribed to OTP: ${data.otp}`);
    this.otp_subscriptions.set(data.otp, client.id);
  }

  @SubscribeMessage('otp_unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otp: string },
  ) {
    this.logger.log(`Client ${client.id} unsubscribed from OTP: ${data.otp}`);
    this.otp_subscriptions.delete(data.otp);
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
      client.join(member.attachmentGroupId.toString());
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
  }

  emitMemberAuthorize(otp: string, authOtp: string) {
    const socketId = this.otp_subscriptions.get(otp);
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('member_authorize', { otp: authOtp });
    }
  }

  async notifyAttachmentsChange(
    attachmentGroupId: string,
    attachments: FilehubAttachmentMessage[],
  ) {
    return new Promise<void>(async (resolve) => {
      this.server
        .to(attachmentGroupId)
        .emit('attachments_change', { attachments });
      resolve();
    });
  }
}

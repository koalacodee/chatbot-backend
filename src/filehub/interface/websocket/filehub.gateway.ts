import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

interface FilehubSubscribePayload {
  userId: string;
}

type FilehubAttachmentMessage = ReturnType<Attachment['toJSON']> & {
  signedUrl: string;
};

@WebSocketGateway({
  namespace: '/filehub',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class FilehubGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(FilehubGateway.name);

  constructor(private readonly fileHubService: FileHubService) {}
  @WebSocketServer()
  private server: Server;

  private readonly socketToUser: Map<string, string> = new Map();

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected ${client.id}`);
    this.unregisterClient(client);
  }

  @SubscribeMessage('filehub:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: FilehubSubscribePayload,
  ): void {
    if (!payload?.userId) {
      this.logger.warn(`Missing userId for client ${client.id}`);
      client.emit('filehub:error', { message: 'userId is required' });
      return;
    }

    const previousUserId = this.socketToUser.get(client.id);
    if (previousUserId && previousUserId !== payload.userId) {
      client.leave(this.getUserRoom(previousUserId));
    }

    this.socketToUser.set(client.id, payload.userId);
    client.join(this.getUserRoom(payload.userId));

    client.emit('filehub:subscribed', { userId: payload.userId });
    this.logger.log(
      `Client ${client.id} subscribed to user ${payload.userId} updates`,
    );
  }

  async broadcastAttachment(attachment: Attachment): Promise<void> {
    if (!this.server) {
      this.logger.warn('Socket server not ready, skipping broadcast');
      return;
    }

    const payload: FilehubAttachmentMessage = {
      ...attachment.toJSON(),
      signedUrl: (await this.fileHubService.getSignedUrl(attachment.filename))
        .signed_url,
    };

    const userId = attachment.userId;
    if (userId) {
      this.server
        .to(this.getUserRoom(userId))
        .emit('filehub:attachment', payload);
      this.logger.log(`Emitted attachment ${attachment.id} to user ${userId}`);
    }

    if (attachment.isGlobal) {
      this.server.emit('filehub:attachment', payload);
      this.logger.log(
        `Broadcasted global attachment ${attachment.id} to all clients`,
      );
    }
  }

  @SubscribeMessage('filehub:unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket): void {
    this.unregisterClient(client);
  }

  private getUserRoom(userId: string): string {
    return `filehub:user:${userId}`;
  }

  private unregisterClient(client: Socket): void {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      client.leave(this.getUserRoom(userId));
      this.socketToUser.delete(client.id);
    }
  }
}

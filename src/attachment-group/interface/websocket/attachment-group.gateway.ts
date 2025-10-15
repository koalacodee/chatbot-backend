import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

interface SubscribeMessage {
  type: 'subscribe';
  groupKey: string;
}

interface UpdateMessage {
  type: 'update';
  data: any;
}

@WebSocketGateway({
  namespace: '/attachment-groups',
  cors: {
    origin: '*', // عدلها حسب الحاجة
  },
})
@Injectable()
export class AttachmentGroupGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AttachmentGroupGateway.name);

  // groupKey => socketIds
  private readonly subscriptions: Map<string, Set<string>> = new Map();

  // socketId => groupKeys
  private readonly socketSubscriptions: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.socketSubscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    const groupKeys = this.socketSubscriptions.get(client.id);
    if (groupKeys) {
      groupKeys.forEach((groupKey) =>
        this.removeFromGroup(client.id, groupKey),
      );
    }

    this.socketSubscriptions.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupKey: string },
  ): void {
    try {
      this.logger.log(`Received subscribe message: ${JSON.stringify(data)}`);

      if (data && data.groupKey) {
        this.addToGroup(client.id, data.groupKey);
        this.logger.log(
          `Client ${client.id} subscribed to group: ${data.groupKey}`,
        );

        // Acknowledge subscription
        client.emit('subscribed', {
          groupKey: data.groupKey,
          status: 'success',
        });
      } else {
        this.logger.warn(
          `Invalid subscribe message format: ${JSON.stringify(data)}`,
        );
        client.emit('error', { message: 'Invalid subscribe message format' });
      }
    } catch (error) {
      this.logger.error('Error handling subscribe message:', error);
      client.emit('error', { message: 'Server error processing subscription' });
    }
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ): void {
    try {
      this.logger.log(`Received message: ${JSON.stringify(data)}`);

      // Legacy support for JSON string messages
      if (typeof data === 'string') {
        try {
          const message = JSON.parse(data) as SubscribeMessage;

          if (message.type === 'subscribe' && message.groupKey) {
            this.addToGroup(client.id, message.groupKey);
            this.logger.log(
              `Client ${client.id} subscribed to group: ${message.groupKey}`,
            );

            // Acknowledge subscription
            client.emit('subscribed', {
              groupKey: message.groupKey,
              status: 'success',
            });
          }
        } catch (error) {
          this.logger.error('Error parsing message:', error);
          client.emit('error', { message: 'Invalid message format' });
        }
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      client.emit('error', { message: 'Server error processing message' });
    }
  }

  private addToGroup(socketId: string, groupKey: string): void {
    try {
      // Track in our maps
      if (!this.subscriptions.has(groupKey)) {
        this.subscriptions.set(groupKey, new Set());
      }

      this.subscriptions.get(groupKey).add(socketId);
      this.socketSubscriptions.get(socketId)?.add(groupKey);

      // Also add to Socket.IO room if possible
      if (this.server && this.server.sockets && this.server.sockets.sockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(groupKey);
          this.logger.log(
            `Added client ${socketId} to Socket.IO room ${groupKey}`,
          );
        } else {
          this.logger.warn(
            `Could not find socket ${socketId} to add to room ${groupKey}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error adding client ${socketId} to group ${groupKey}:`,
        error,
      );
    }
  }

  private removeFromGroup(socketId: string, groupKey: string): void {
    try {
      // Remove from our tracking maps
      const group = this.subscriptions.get(groupKey);
      if (group) {
        group.delete(socketId);
        if (group.size === 0) {
          this.subscriptions.delete(groupKey);
          this.logger.log(
            `Group ${groupKey} is now empty and has been removed`,
          );
        }
      }

      const clientGroups = this.socketSubscriptions.get(socketId);
      if (clientGroups) {
        clientGroups.delete(groupKey);
      }

      // Also remove from Socket.IO room if possible
      if (this.server && this.server.sockets && this.server.sockets.sockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(groupKey);
          this.logger.log(
            `Removed client ${socketId} from Socket.IO room ${groupKey}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error removing client ${socketId} from group ${groupKey}:`,
        error,
      );
    }
  }

  /**
   * Send a message to all clients subscribed to a specific group
   */
  notifyGroup(groupKey: string, payload: any): void {
    this.logger.log(
      `Attempting to notify group ${groupKey} with payload: ${JSON.stringify(payload)}`,
    );

    // Simplified approach: Just use Socket.IO's built-in room broadcasting
    try {
      if (!this.server) {
        this.logger.warn('WebSocket server not initialized yet');
        return;
      }

      const message: UpdateMessage = { type: 'update', data: payload };

      // Broadcast directly to all clients in the namespace
      this.server.emit('update', message);
      this.logger.log(`Broadcasted update to all clients in namespace`);

      // Also try to emit to the specific room
      try {
        this.server.to(groupKey).emit('update', message);
        this.logger.log(`Also emitted to room ${groupKey}`);
      } catch (error) {
        this.logger.warn(`Room-specific emission failed: ${error.message}`);
      }
    } catch (error) {
      this.logger.error('Error notifying group:', error);
    }
  }
}

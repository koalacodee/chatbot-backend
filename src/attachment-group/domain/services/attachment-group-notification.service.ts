import { Injectable } from '@nestjs/common';
import { AttachmentGroupGateway } from '../../interface/websocket/attachment-group.gateway';

@Injectable()
export class AttachmentGroupNotificationService {
  constructor(private readonly gateway: AttachmentGroupGateway) {}

  /**
   * Notify all clients subscribed to a specific group about an update
   */
  notifyGroupUpdate(groupKey: string, data: any): void {
    this.gateway.notifyGroup(groupKey, data);
  }
}

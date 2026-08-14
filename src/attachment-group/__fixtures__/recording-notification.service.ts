import { AttachmentGroupNotificationService } from '../domain/services/attachment-group-notification.service';

/**
 * The real service only forwards to the websocket gateway, so there is nothing to
 * simulate — this records what it was asked to broadcast, and can be told to throw.
 *
 * The throwing mode matters: UpdateAttachmentGroupUseCase wraps the notify call in a
 * try/catch precisely so a websocket failure cannot roll back a persisted update, and
 * that guarantee is only testable if the double can fail.
 */
export class RecordingNotificationService extends AttachmentGroupNotificationService {
  readonly notifications: Array<{ groupKey: string; data: any }> = [];

  private failure: Error | null = null;

  constructor() {
    // The real class takes a gateway; nothing here reaches it.
    super(undefined as any);
  }

  failWith(error: Error): this {
    this.failure = error;
    return this;
  }

  notifyGroupUpdate(groupKey: string, data: any): void {
    if (this.failure) throw this.failure;

    this.notifications.push({ groupKey, data });
  }
}

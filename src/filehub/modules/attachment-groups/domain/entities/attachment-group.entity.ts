import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

export interface AttachmentGroupOptions {
  id?: string;
  createdById: string;
  key: string;
  clientIds?: string[];
  attachmentIds?: string[];
  attachments?: Attachment[];
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
}

export class AttachmentGroup {
  private readonly _id: UUID;
  private readonly _createdById: UUID;
  private _key: string;
  private _clientIds: string[];
  private _attachmentIds: UUID[];
  private _attachments: Attachment[];
  private _createdAt: Date;
  private _updatedAt: Date;
  private _expiresAt: Date;

  private constructor(options: AttachmentGroupOptions) {
    this._id = UUID.create(options.id);
    this._createdById = UUID.create(options.createdById);
    this._key = options.key;
    this._clientIds = options.clientIds || [];
    this._attachmentIds = (options.attachmentIds || []).map((id) =>
      UUID.create(id),
    );
    this._attachments = options.attachments || [];
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._expiresAt = options.expiresAt;
  }

  static create(options: AttachmentGroupOptions): AttachmentGroup {
    return new AttachmentGroup(options);
  }

  get id(): string {
    return this._id.value;
  }

  get createdById(): string {
    return this._createdById.value;
  }

  get key(): string {
    return this._key;
  }

  set key(value: string) {
    this._key = value;
  }

  get clientIds(): string[] {
    return [...this._clientIds];
  }

  addClient(clientId: string): void {
    if (!this._clientIds.includes(clientId)) {
      this._clientIds.push(clientId);
      this._updatedAt = new Date();
    }
  }

  get attachmentIds(): string[] {
    return this._attachmentIds.map((id) => id.value);
  }

  updateAttachments(attachmentIds: string[]): void {
    this._attachmentIds = attachmentIds.map((id) => UUID.create(id));
    this._updatedAt = new Date();
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  isExpired(referenceDate: Date = new Date()): boolean {
    return (
      this._expiresAt && this._expiresAt.getTime() <= referenceDate.getTime()
    );
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  set expiresAt(value: Date) {
    this._expiresAt = value;
  }

  get attachments(): Attachment[] {
    return [...this._attachments];
  }

  set attachments(value: Attachment[]) {
    this._attachments = value;
  }

  toJSON() {
    return {
      id: this._id.value,
      createdById: this._createdById.value,
      key: this._key,
      ips: this._clientIds,
      attachmentIds: this._attachmentIds.map((id) => id.value),
      attachments: this._attachments.map((attachment) => attachment.toJSON()),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      expiresAt: this._expiresAt,
    };
  }
}

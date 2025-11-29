import { Attachment } from 'src/files/domain/entities/attachment.entity';

export class AttachmentGroupResponseDto {
  id: string;
  key: string;
  createdById: string;
  ips: string[];
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export class ClientAttachmentGroupResponseDto {
  attachments: Attachment[];
}

export class CreatorAttachmentGroupResponseDto {
  id: string;
  key: string;
  ips: string[];
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export class CreateAttachmentGroupResponseDto {
  key: string;
}

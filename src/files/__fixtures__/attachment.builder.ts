import { Attachment } from '../domain/entities/attachment.entity';

let counter = 0;

/** Deterministic, valid uuids so tests read as data rather than noise. */
export const testUuid = (suffix: number): string =>
  `018f4a1e-1c7a-7000-8000-${suffix.toString().padStart(12, '0')}`;

export interface BuildAttachmentOptions {
  id?: string;
  userId?: string;
  isGlobal?: boolean;
  cloned?: boolean;
  targetId?: string;
  filename?: string;
}

export function buildAttachment(
  options: BuildAttachmentOptions = {},
): Attachment {
  counter += 1;

  return Attachment.create({
    id: options.id ?? testUuid(9000 + counter),
    type: 'image/png',
    filename: options.filename ?? `file-${counter}.png`,
    originalName: `original-${counter}.png`,
    userId: options.userId,
    isGlobal: options.isGlobal ?? false,
    cloned: options.cloned ?? false,
    targetId: options.targetId,
    size: 1024,
  });
}

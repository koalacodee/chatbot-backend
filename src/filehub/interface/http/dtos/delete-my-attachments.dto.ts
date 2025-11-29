import { IsArray, IsString, ArrayNotEmpty, ValidateIf } from 'class-validator';

export class DeleteMyAttachmentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ValidateIf((o) => !o.singleAttachmentId) // required only when singleId missing
  attachmentIds?: string[];

  @IsString()
  @ValidateIf((o) => !o.attachmentIds) // required only when array missing
  singleAttachmentId?: string;
}

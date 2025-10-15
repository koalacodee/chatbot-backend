import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateAttachmentGroupDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  attachmentIds: string[];
}

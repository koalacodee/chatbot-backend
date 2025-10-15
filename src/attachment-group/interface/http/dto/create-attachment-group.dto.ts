import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateAttachmentGroupDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  attachmentIds: string[];
}

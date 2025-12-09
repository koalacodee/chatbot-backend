import { IsUUID, IsNotEmpty } from 'class-validator';

export class DeleteMemberDto {
  @IsUUID()
  @IsNotEmpty()
  memberId: string;
}

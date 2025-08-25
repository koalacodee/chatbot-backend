import { IsString } from 'class-validator';

export class ApproveTaskInputDto {
  @IsString()
  approverId: string;
}

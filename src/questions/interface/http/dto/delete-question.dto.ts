import { IsString } from 'class-validator';

export class DeleteQuestionInputDto {
  @IsString()
  id: string;
}
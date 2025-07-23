import { IsArray, IsString } from 'class-validator';

export class DeleteManyQuestionsInputDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
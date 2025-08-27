import { IsEnum, IsUUID } from 'class-validator';

export class RecordInteractionDto {
  @IsUUID()
  faqId: string;

  @IsEnum(['satisfaction', 'dissatisfaction', 'view'])
  type: 'satisfaction' | 'dissatisfaction' | 'view';
}

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @ValidateIf((o: AskDto) => !o.question)
  @IsUUID('4')
  faqId?: string;
}

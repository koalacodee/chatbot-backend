import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

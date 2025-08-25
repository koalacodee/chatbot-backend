import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AnswerTicketDto {
  @ApiProperty({ description: 'Answer content' })
  @IsString()
  content: string;
}
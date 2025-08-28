import { Transform } from 'class-transformer';
import { IsEnum, IsString } from 'class-validator';
import { InteractionType } from 'src/support-tickets/domain/entities/support-ticket-interaction.entity';

export class RecordTicketInteractionDto {
  @IsEnum(InteractionType)
  @Transform(({ value }) => value.toUpperCase())
  type: InteractionType;

  @IsString()
  ticketId: string;
}

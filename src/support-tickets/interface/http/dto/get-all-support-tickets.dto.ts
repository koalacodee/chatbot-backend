import {
  IsEnum,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { SupportTicketStatus } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { CursorInput } from 'src/common/drizzle/helpers/cursor';

export class GetAllSupportTicketsDto {
  @IsOptional()
  @IsObject()
  cursor?: CursorInput;

  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

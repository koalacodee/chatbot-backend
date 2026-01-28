import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { CursorInput } from 'src/common/drizzle/helpers/cursor';

export class GetGuestTicketsWithDetailsDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsObject()
  cursor?: CursorInput;
}

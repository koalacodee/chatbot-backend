import {
  IsArray,
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SendNotificationDto } from './send-notification.dto';

export class SendToUsersDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userIds: string[];

  @ValidateNested()
  @Type(() => SendNotificationDto)
  notification: SendNotificationDto;
}

export class SendToGuestsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  guestIds: string[];

  @ValidateNested()
  @Type(() => SendNotificationDto)
  notification: SendNotificationDto;
}

export class SendToMixedRecipientsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  guestIds?: string[];

  @ValidateNested()
  @Type(() => SendNotificationDto)
  notification: SendNotificationDto;
}

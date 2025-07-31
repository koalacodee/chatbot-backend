import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { PushManagerService } from '../../application/services/push-manager.service';
import { PushNotificationService } from '../../application/services/push-notification.service';
import {
  CreatePushSubscriptionDto,
  PushSubscriptionResponseDto,
  SendToUsersDto,
  SendToGuestsDto,
  SendToMixedRecipientsDto,
} from '../dto';
import { JsendInterceptor } from 'src/common/interceptors/jsend.interceptor';

@Controller('push')
@UseInterceptors(JsendInterceptor)
export class PushManagerController {
  constructor(
    private readonly pushManagerService: PushManagerService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() subscriptionData: CreatePushSubscriptionDto,
  ): Promise<PushSubscriptionResponseDto> {
    const subscription =
      await this.pushManagerService.register(subscriptionData);
    return subscription.toJSON() as PushSubscriptionResponseDto;
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getAllForUser(
    @Param('userId') userId: string,
  ): Promise<PushSubscriptionResponseDto[]> {
    const subscriptions = await this.pushManagerService.getAllForUser(userId);
    return subscriptions.map(
      (sub) => sub.toJSON() as PushSubscriptionResponseDto,
    );
  }

  @Post('send/users')
  @HttpCode(HttpStatus.OK)
  async sendToUsers(@Body() request: SendToUsersDto) {
    const results = await this.pushNotificationService.sendToUsers(
      request.userIds,
      request.notification,
    );
    return results.map((result) => result.toJSON());
  }

  @Post('send/guests')
  @HttpCode(HttpStatus.OK)
  async sendToGuests(@Body() request: SendToGuestsDto) {
    const results = await this.pushNotificationService.sendToGuests(
      request.guestIds,
      request.notification,
    );
    return results.map((result) => result.toJSON());
  }

  @Post('send/mixed')
  @HttpCode(HttpStatus.OK)
  async sendToMixedRecipients(@Body() request: SendToMixedRecipientsDto) {
    const results = await this.pushNotificationService.sendToMixedRecipients(
      request.userIds || [],
      request.guestIds || [],
      request.notification,
    );
    return results.map((result) => result.toJSON());
  }
}

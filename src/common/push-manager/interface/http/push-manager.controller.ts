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
import { CreatePushSubscriptionDto, PushSubscriptionResponseDto } from '../dto';
import { JsendInterceptor } from 'src/common/interceptors/jsend.interceptor';

@Controller('push')
@UseInterceptors(JsendInterceptor)
export class PushManagerController {
  constructor(private readonly pushManagerService: PushManagerService) {}

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
}

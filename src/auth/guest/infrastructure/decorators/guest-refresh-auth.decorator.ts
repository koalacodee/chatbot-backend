import { applyDecorators, UseGuards } from '@nestjs/common';
import { GuestRefreshTokenGuard } from '../guards/guest-refresh-token.guard';

export function GuestRefreshAuth() {
  return applyDecorators(UseGuards(GuestRefreshTokenGuard));
}

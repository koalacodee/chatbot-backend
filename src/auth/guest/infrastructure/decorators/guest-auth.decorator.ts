import { applyDecorators, UseGuards } from '@nestjs/common';
import { GuestJwtAuthGuard } from '../guards/guest-jwt-auth.guard';

export function GuestAuth() {
  return applyDecorators(UseGuards(GuestJwtAuthGuard));
}

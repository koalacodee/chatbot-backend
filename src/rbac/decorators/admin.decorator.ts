import { applyDecorators, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';

export const AdminAuth = () =>
  applyDecorators(UseGuards(UserJwtAuthGuard, AdminGuard));

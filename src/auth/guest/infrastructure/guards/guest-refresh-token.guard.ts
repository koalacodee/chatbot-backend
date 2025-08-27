import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GuestRefreshTokenGuard extends AuthGuard('guest-refresh-token') {}

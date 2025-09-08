import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { UUID } from '../value-objects/uuid.vo';

@Injectable()
export class GuestIdInterceptor implements NestInterceptor {
  private readonly GUEST_COOKIE_NAME = 'guest_id';
  private readonly COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip if user is already authenticated
    if (request.user) {
      return next.handle();
    }

    let guestId = request.cookies[this.GUEST_COOKIE_NAME];

    // Generate new guest ID if none exists
    if (!guestId) {
      guestId = UUID.create().toString();

      // Set cookie with guest ID
      response.cookie(this.GUEST_COOKIE_NAME, guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: this.COOKIE_MAX_AGE,
        path: '/',
      });
    }

    // Inject guest ID into request object
    request['guest'] = {
      id: guestId,
      isGuest: true,
    };

    return next.handle();
  }
}

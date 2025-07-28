import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { RedisService } from 'src/shared/infrastructure/redis';

@Injectable()
export class GuestInterceptor implements NestInterceptor {
  private readonly GUEST_TTL = parseInt(this.config.getOrThrow('GUEST_TTL'));

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    if (request.user) {
      return next.handle();
    }

    let guestId = request.cookies?.guest_id;

    if (guestId) {
      const guest = await this.redis.get(`guest${guestId}`);

      if (!guest) {
        throw new UnauthorizedException({ guest: 'guest_expired' });
      }

      return next.handle();
    }

    guestId = randomUUID();
    await this.redis.set(
      `guest:${guestId}`,
      JSON.stringify({ createdAt: new Date() }),
      this.GUEST_TTL,
    );
    response.cookie('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: this.GUEST_TTL,
    });

    request.guest = { id: guestId };

    return next.handle();
  }
}

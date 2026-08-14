import { Global, Module } from '@nestjs/common';
import { GuestRepository } from './domain/repositories/guest.repository';
import { DrizzleGuestRepository } from './infrastructure/repositories/drizzle-guest.repository';

@Global()
@Module({
  providers: [
    {
      provide: GuestRepository,
      useClass: DrizzleGuestRepository,
    },
  ],
  exports: [GuestRepository],
})
export class GuestModule {}

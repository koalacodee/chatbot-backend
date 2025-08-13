import { Module } from '@nestjs/common';
import { GuestRepository } from './domain/repositories/guest.repository';
import { PrismaGuestRepository } from './infrastructure/repositories/prisma-guest.repository';

@Module({
  providers: [
    {
      provide: GuestRepository,
      useClass: PrismaGuestRepository,
    },
  ],
  exports: [GuestRepository],
})
export class GuestModule {}

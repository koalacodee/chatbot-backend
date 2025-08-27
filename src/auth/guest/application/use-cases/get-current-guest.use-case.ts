import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';

interface GetCurrentGuestInput {
  guestId: string;
}

interface GetCurrentGuestOutput {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class GetCurrentGuestUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: GetCurrentGuestInput): Promise<GetCurrentGuestOutput> {
    const { guestId } = input;

    const guest = await this.guestRepository.findById(guestId);
    if (!guest) {
      throw new UnauthorizedException({ guest: 'guest_not_found' });
    }

    return {
      id: guest.id.toString(),
      name: guest.name,
      email: guest.email?.toString(),
      phone: guest.phone,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
    };
  }
}

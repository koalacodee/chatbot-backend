import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { User } from 'src/shared/entities/user.entity';

export interface CompleteAccountInput {
  token: string;
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class CompleteAccountUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(input: CompleteAccountInput) {
    // 1. Retrieve invitation from Redis
    const invitationRaw = await this.redis.get(`invite:${input.token}`);
    if (!invitationRaw) {
      throw new NotFoundException('Invitation not found or expired.');
    }
    const invitation = JSON.parse(invitationRaw);

    // 2. Check if user already exists with the new email
    const exists = await this.userRepo.existsByEmail(input.email);
    if (exists) {
      throw new BadRequestException('User with this email already exists.');
    }

    // 3. Create the user with redefined info, but keep the role from invitation
    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role: invitation.role,
    });

    // 4. Save the user
    await this.userRepo.save(user);

    // 5. Delete the invitation from Redis
    await this.redis.del(`invite:${input.token}`);

    const { password, ...toReturn } = user.toJSON();
    return toReturn;
  }
}

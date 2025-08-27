import { Injectable, NotFoundException } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import { UserRepository } from 'src/shared/repositories/user.repository';

interface LoginInput {
  username: string;
  password: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly tokenService: TokensService,
  ) {}

  async execute(input: LoginInput) {
    const user = await this.userRepo.findByUsername(input.username);

    if (!user) {
      throw new NotFoundException({ user: 'user_not_found' });
    }

    await user.password.verify(input.password);

    const { password, ...userData } = user.toJSON();

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      userData.id,
      userData.email,
      userData.role,
    );

    return {
      user: userData,
      ...tokens,
    };
  }
}

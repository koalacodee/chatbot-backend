import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { TokenService } from '../../infrastructure/services/token.service';

interface LoginInput {
  email: string;
  password: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginInput) {
    const user = await this.userRepo.findByEmail(input.email);
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

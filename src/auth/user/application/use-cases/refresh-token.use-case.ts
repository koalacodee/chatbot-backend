import { Injectable } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import { GetAuthorizedUserUseCase } from './get-authorized-user.use-case';

interface RefreshTokenInput {
  userId: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly tokenService: TokensService,
    private readonly getAuthorizedUser: GetAuthorizedUserUseCase,
  ) {}

  async execute(input: RefreshTokenInput) {
    const payload = await this.getAuthorizedUser.execute({
      userId: input.userId,
    });
    return await this.tokenService.generateTokens(
      payload.id,
      payload.email,
      payload.role,
      payload.permissions,
    );
  }
}

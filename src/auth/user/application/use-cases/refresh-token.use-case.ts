import { Injectable } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';

interface RefreshTokenInput {
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly tokenService: TokensService) {}

  async execute(input: RefreshTokenInput) {
    return await this.tokenService.refreshTokens(input.refreshToken);
  }
}

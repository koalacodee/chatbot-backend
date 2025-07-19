import { Injectable } from '@nestjs/common';
import { TokenService } from '../../infrastructure/services/token.service';

interface RefreshTokenInput {
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(input: RefreshTokenInput) {
    return await this.tokenService.refreshAccessToken(input.refreshToken);
  }
}
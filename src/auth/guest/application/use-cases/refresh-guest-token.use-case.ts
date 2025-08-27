import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';

interface RefreshGuestTokenInput {
  refreshToken: string;
}

interface RefreshGuestTokenOutput {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshGuestTokenUseCase {
  constructor(private readonly tokenService: TokensService) {}

  async execute(
    input: RefreshGuestTokenInput,
  ): Promise<RefreshGuestTokenOutput> {
    try {
      const { refreshToken } = input;

      // Use token service to refresh guest tokens
      const tokens = await this.tokenService.refreshTokens(refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (
        error.message.includes('Invalid') ||
        error.message.includes('expired')
      ) {
        throw new UnauthorizedException({ token: 'invalid_or_expired' });
      }
      throw error;
    }
  }
}

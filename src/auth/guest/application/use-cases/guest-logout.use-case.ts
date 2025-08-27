import { Injectable } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';

interface GuestLogoutInput {
  refreshToken: string;
}

interface GuestLogoutOutput {
  success: boolean;
}

@Injectable()
export class GuestLogoutUseCase {
  constructor(private readonly tokenService: TokensService) {}

  async execute(input: GuestLogoutInput): Promise<GuestLogoutOutput> {
    const { refreshToken } = input;

    try {
      // Revoke the refresh token
      await this.tokenService.revokeRefreshToken(refreshToken);

      return { success: true };
    } catch (error) {
      // Even if token doesn't exist, we return success for security
      return { success: true };
    }
  }
}

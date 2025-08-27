import { Injectable } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';

interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(private readonly tokenService: TokensService) {}

  async execute(input: LogoutInput) {
    await this.tokenService.revokeRefreshToken(input.refreshToken);
    return { success: true };
  }
}

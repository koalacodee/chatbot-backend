import { Injectable } from '@nestjs/common';
import { TokenService } from '../../infrastructure/services/token.service';

interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(input: LogoutInput) {
    await this.tokenService.revokeRefreshToken(input.refreshToken);
    return { success: true };
  }
}
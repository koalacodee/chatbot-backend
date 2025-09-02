import { Response } from 'express';
import { PermissionsEnum } from 'src/rbac/decorators/permissions.decorator';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export abstract class TokensService {
  abstract generateTokens(
    guestId: string,
    email: string,
    role?: string,
    permissions?: any,
  ): Tokens | Promise<Tokens>;
  protected abstract generateAccessToken(
    guestId: string,
    email: string,
    role?: string,
  ): string | Promise<string>;
  protected abstract generateRefreshToken(
    guestId: string,
    email: string,
    role?: string,
  ): string | Promise<string>;
  abstract refreshTokens(refreshToken: string): Tokens | Promise<Tokens>;
  abstract revokeRefreshToken(refreshToken: string): void | Promise<void>;
  abstract revokeAllRefreshTokens(guestId: string): void | Promise<void>;
  abstract setRefreshTokenCookie(
    res: Response,
    token: string,
  ): void | Promise<void>;
  abstract clearRefreshTokenCookie(res: Response): void | Promise<void>;
}

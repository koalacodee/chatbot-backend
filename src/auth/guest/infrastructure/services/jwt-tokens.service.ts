import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';
import { Response } from 'express';
import { RefreshToken } from 'src/auth/domain/entities/refresh-token.entity';
import { TokensService } from 'src/auth/domain/services/tokens.service';

@Injectable()
export class JwtTokenService extends TokensService {
  private GUEST_REFRESH_TOKEN_SECRET: string;
  private GUEST_ACCESS_TOKEN_SECRET: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {
    super();
    this.GUEST_REFRESH_TOKEN_SECRET = this.config.getOrThrow(
      'GUEST_REFRESH_TOKEN_SECRET',
    );
    this.GUEST_ACCESS_TOKEN_SECRET = this.config.getOrThrow(
      'GUEST_ACCESS_TOKEN_SECRET',
    );
  }

  async generateTokens(guestId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(guestId, email),
      this.generateRefreshToken(guestId, email),
    ]);

    // Store refresh token in the database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days expiry

    const refreshTokenEntity = new RefreshToken({
      token: refreshToken,
      targetId: guestId,
      expiresAt: refreshTokenExpiry,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
    };
  }

  async generateAccessToken(guestId: string, email: string): Promise<string> {
    const payload = { sub: guestId, email, role: 'guest' };
    return this.jwtService.signAsync(payload, {
      secret: this.GUEST_ACCESS_TOKEN_SECRET,
      expiresIn: '30m', // Short-lived access token
    });
  }

  async generateRefreshToken(guestId: string, email: string): Promise<string> {
    const payload = { sub: guestId, email, role: 'guest' };
    return this.jwtService.signAsync(payload, {
      secret: this.GUEST_REFRESH_TOKEN_SECRET,
      expiresIn: '7d', // Longer-lived refresh token
    });
  }

  async refreshTokens(refreshToken: string) {
    // Verify the refresh token exists and is not revoked
    const storedToken =
      await this.refreshTokenRepository.findByToken(refreshToken);

    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedException('Invalid guest refresh token');
    }

    if (storedToken.isExpired) {
      throw new UnauthorizedException('Guest refresh token expired');
    }

    // Decode the token to get guest information
    const decoded = (await this.jwtService
      .verifyAsync(storedToken.token, {
        secret: this.GUEST_REFRESH_TOKEN_SECRET,
      })
      .catch(() => {
        throw new UnauthorizedException('Invalid guest refresh token');
      })) as {
      sub: string;
      email: string;
      role: string;
    };

    if (decoded.role !== 'guest') {
      throw new UnauthorizedException('Invalid guest refresh token');
    }

    // Revoke the old refresh token
    await this.revokeRefreshToken(refreshToken);

    // Generate new tokens
    const newTokens = await this.generateTokens(decoded.sub, decoded.email);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.revokeToken(refreshToken);
  }

  async revokeAllRefreshTokens(guestId: string): Promise<void> {
    await this.refreshTokenRepository.deleteAllForTarget(guestId);
  }

  setRefreshTokenCookie(res: Response, token: string): void {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const COOKIE_SAMESITE = this.config.get('COOKIES_SAMESITE', 'strict');
    const COOKIE_SECURE = this.config.get('COOKIES_SECURE', true);

    res.cookie('guest_refresh_token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      expires: expiryDate,
      path: '/',
    });
  }

  clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('guest_refresh_token', {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', 'development') === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';
import { Response } from 'express';
import { RefreshToken } from 'src/auth/domain/entities/refresh-token.entity';
import { TokensService } from 'src/auth/domain/services/tokens.service';

@Injectable()
export class JwtTokensService extends TokensService {
  private readonly REFRESH_TOKEN_SECRET: string;
  private readonly ACCESS_TOKEN_SECRET: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {
    super();
    this.REFRESH_TOKEN_SECRET = this.config.getOrThrow(
      'USER_REFRESH_TOKEN_SECRET',
    );
    this.ACCESS_TOKEN_SECRET = this.config.getOrThrow(
      'USER_ACCESS_TOKEN_SECRET',
    );
  }

  async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role),
      this.generateRefreshToken(userId, email, role),
    ]);

    // Store refresh token in the database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days expiry

    const refreshTokenEntity = new RefreshToken({
      token: refreshToken,
      targetId: userId,
      expiresAt: refreshTokenExpiry,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
    };
  }

  async generateAccessToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, {
      secret: this.ACCESS_TOKEN_SECRET,
      expiresIn: '30m', // Short-lived access token
    });
  }

  async generateRefreshToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, {
      secret: this.REFRESH_TOKEN_SECRET,
      expiresIn: '7d', // Longer-lived refresh token
    });
  }

  async refreshTokens(refreshToken: string) {
    // Verify the refresh token exists and is not revoked
    const storedToken =
      await this.refreshTokenRepository.findByToken(refreshToken);

    if (!storedToken || storedToken.isRevoked) {
      throw new Error('Invalid refresh token');
    }

    if (storedToken.isExpired) {
      throw new Error('Refresh token expired');
    }

    // Decode the token to get user information
    const decoded = this.jwtService.decode(storedToken.token) as {
      sub: string;
      email: string;
      role: string;
    };

    // Generate a new access token
    const accessToken = await this.generateAccessToken(
      decoded.sub,
      decoded.email,
      decoded.role,
    );

    const newRefreshToken = await this.generateRefreshToken(
      decoded.sub,
      decoded.email,
      decoded.role,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeRefreshToken(token: string) {
    await this.refreshTokenRepository.revokeToken(token);
  }

  async revokeAllRefreshTokens(userId: string) {
    await this.refreshTokenRepository.deleteAllForTarget(userId);
  }

  // Helper method to set refresh token cookie
  setRefreshTokenCookie(res: Response, token: string) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const COOKIE_SAMESITE = this.config.get('COOKIES_SAMESITE', 'strict');
    const COOKIE_SECURE = this.config.get('COOKIES_SECURE', true);

    res.cookie('user_refresh_token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      expires: expiryDate,
      path: '/',
    });
  }

  // Helper method to clear refresh token cookie
  clearRefreshTokenCookie(res: Response) {
    res.clearCookie('user_refresh_token', {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', 'development') === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
}

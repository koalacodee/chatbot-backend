import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';
import { Response } from 'express';
import { RefreshToken } from 'src/auth/domain/entities/refresh-token.entity';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import { PermissionsEnum } from 'src/rbac/decorators/permissions.decorator';

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

  async generateTokens(
    userId: string,
    email: string,
    role: string,
    permissions?: PermissionsEnum,
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role, permissions),
      this.generateRefreshToken(userId, email, role, permissions),
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

  async generateAccessToken(
    userId: string,
    email: string,
    role: string,
    permissions?: PermissionsEnum,
  ) {
    const payload = { sub: userId, email, role, permissions };
    return this.jwtService.signAsync(payload, {
      secret: this.ACCESS_TOKEN_SECRET,
      expiresIn: '30m', // Short-lived access token
    });
  }

  async generateRefreshToken(
    userId: string,
    email: string,
    role: string,
    permissions?: PermissionsEnum,
  ) {
    const payload = { sub: userId, email, role, permissions };
    return this.jwtService.signAsync(payload, {
      secret: this.REFRESH_TOKEN_SECRET,
      expiresIn: '7d', // Longer-lived refresh token
    });
  }

  async refreshTokens(refreshToken: string) {
    // Decode the token to get user information
    const decoded = this.jwtService.decode(refreshToken) as {
      sub: string;
      email: string;
      role: string;
      permissions?: PermissionsEnum;
    };

    // Generate a new access token
    const accessToken = await this.generateAccessToken(
      decoded.sub,
      decoded.email,
      decoded.role,
      decoded.permissions,
    );

    const newRefreshToken = await this.generateRefreshToken(
      decoded.sub,
      decoded.email,
      decoded.role,
      decoded.permissions,
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

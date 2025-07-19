import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from 'src/auth/repositories/refresh-token.repository';
import { Response } from 'express';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role),
      this.generateRefreshToken(userId, email, role),
    ]);

    // Store refresh token in the database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days expiry

    await this.refreshTokenRepository.create({
      token: refreshToken,
      userId,
      expiresAt: refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAccessToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, {
      secret: this.config.get('ACCESS_JWT_SECRET'),
      expiresIn: '30m', // Short-lived access token
    });
  }

  private async generateRefreshToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, {
      secret: this.config.get('REFRESH_JWT_SECRET'),
      expiresIn: '7d', // Longer-lived refresh token
    });
  }

  async refreshAccessToken(refreshToken: string) {
    // Verify the refresh token exists and is not revoked
    const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
    
    if (!storedToken || storedToken.revokedAt) {
      throw new Error('Invalid refresh token');
    }
    
    if (new Date() > new Date(storedToken.expiresAt)) {
      throw new Error('Refresh token expired');
    }
    
    // Decode the token to get user information
    const decoded = this.jwtService.decode(refreshToken) as {
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
    
    return { accessToken };
  }

  async revokeRefreshToken(token: string) {
    await this.refreshTokenRepository.revokeToken(token);
  }

  async revokeAllUserTokens(userId: string) {
    await this.refreshTokenRepository.deleteAllForUser(userId);
  }
  
  // Helper method to set refresh token cookie
  setRefreshTokenCookie(res: Response, token: string) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiryDate,
      path: '/',
    });
  }
  
  // Helper method to clear refresh token cookie
  clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
}
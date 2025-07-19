import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import { LoginUseCase } from 'src/auth/application/use-cases/login.use-case';
import { RefreshTokenUseCase } from 'src/auth/application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from 'src/auth/application/use-cases/logout.use-case';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenGuard } from '../../infrastructure/guards/refresh-token.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
  ) {}

  @Post('login')
  @HttpCode(200)
  async handleLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.login.execute(dto);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    // Return only the access token and user info in the response body
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(200)
  async handleRefreshToken(@Req() req: Request) {
    const refreshToken = req.cookies['refresh_token'];
    return await this.refreshToken.execute({ refreshToken });
  }

  @UseGuards(RefreshTokenGuard)
  @Post('logout')
  @HttpCode(200)
  async handleLogout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    await this.logout.execute({ refreshToken });

    // Clear the refresh token cookie
    res.clearCookie('refresh_token');

    return { success: true };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    // Calculate expiry date (7 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // Set the cookie with secure options
    res.cookie('refresh_token', token, {
      httpOnly: true, // Prevents client-side JavaScript from reading the cookie
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'strict', // Prevents the cookie from being sent in cross-site requests
      expires: expiryDate, // Cookie expiration date
      path: '/', // Cookie is available for all routes
    });
  }
}

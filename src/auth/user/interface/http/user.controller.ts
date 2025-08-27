import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  GetAuthorizedUserUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
} from '../../application/use-cases';
import { UserRefreshTokenGuard } from '../../infrastructure/guards/refresh-token.guard';
import { UserJwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard';

@Controller('auth')
export class UserAuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly getAuthorizedUser: GetAuthorizedUserUseCase,
    private readonly config: ConfigService,
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

  @UseGuards(UserRefreshTokenGuard)
  @Post('refresh')
  @HttpCode(200)
  async handleRefreshToken(@Req() req: Request) {
    const refreshToken = req.cookies['refresh_token'];
    console.log(refreshToken);
    return await this.refreshToken.execute({ refreshToken });
  }

  @UseGuards(UserRefreshTokenGuard)
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

  @UseGuards(UserJwtAuthGuard)
  @Get('me')
  @HttpCode(200)
  async getCurrentUser(@Req() req: any): Promise<any> {
    const userId = req.user.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return await this.getAuthorizedUser.execute({ userId });
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    // Calculate expiry date (7 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const COOKIE_SAMESITE = this.config.get('COOKIES_SAMESITE', 'strict');
    const COOKIE_SECURE = this.config.get('COOKIES_SECURE', true);

    console.log(COOKIE_SAMESITE, COOKIE_SECURE);

    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      expires: expiryDate,
    });
  }
}

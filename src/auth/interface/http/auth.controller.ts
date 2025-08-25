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
import { LoginUseCase } from 'src/auth/application/use-cases/login.use-case';
import { RefreshTokenUseCase } from 'src/auth/application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from 'src/auth/application/use-cases/logout.use-case';
import { RegisterGuestUseCase } from 'src/auth/application/use-cases/register-guest.use-case';
import { LoginGuestUseCase } from 'src/auth/application/use-cases/login-guest.use-case';
import { VerifyLoginUseCase } from 'src/auth/application/use-cases/verify-login.use-case';
import { VerifyRegisterUseCase } from 'src/auth/application/use-cases/verify-register.use-case';
import { GetAuthorizedUserUseCase } from 'src/auth/application/use-cases/get-authorized-user.use-case';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenGuard } from '../../infrastructure/guards/refresh-token.guard';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly registerGuestUseCase: RegisterGuestUseCase,
    private readonly loginGuestUseCase: LoginGuestUseCase,
    private readonly verifyLoginUseCase: VerifyLoginUseCase,
    private readonly verifyRegisterUseCase: VerifyRegisterUseCase,
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

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(200)
  async handleRefreshToken(@Req() req: Request) {
    const refreshToken = req.cookies['refresh_token'];
    console.log(refreshToken);
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

  @Post('guest/register')
  @HttpCode(201)
  async registerGuest(
    @Body()
    dto: {
      name: string;
      email: string;
      phone?: string;
      password: string;
    },
  ) {
    return this.registerGuestUseCase.execute(dto);
  }

  @Post('guest/login')
  @HttpCode(200)
  async loginGuest(@Body() dto: { identifier: string; password: string }) {
    return this.loginGuestUseCase.execute(dto);
  }

  @Post('verify/login')
  @HttpCode(200)
  async verifyLogin(
    @Body() dto: { code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.verifyLoginUseCase.execute(dto.code);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      guest: result.guest,
      accessToken: result.tokens.accessToken,
    };
  }

  @Post('verify/register')
  @HttpCode(200)
  async verifyRegister(
    @Body() dto: { code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.verifyRegisterUseCase.execute(dto.code);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      guest: result.guest,
      accessToken: result.tokens.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
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
    const NODE_ENV = this.config.get('NODE_ENV', 'development');

    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiryDate,
      path: '/',
    });
  }
}

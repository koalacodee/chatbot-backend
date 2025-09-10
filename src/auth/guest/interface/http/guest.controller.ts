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
import { ConfigService } from '@nestjs/config';
import { GuestRefreshTokenGuard } from '../../infrastructure/guards/guest-refresh-token.guard';
import {
  GetCurrentGuestUseCase,
  GuestLogoutUseCase,
  LoginGuestUseCase,
  RefreshGuestTokenUseCase,
  RegisterGuestUseCase,
  VerifyLoginUseCase,
  VerifyRegisterUseCase,
} from '../../application/use-cases';
import { LoginGuestDto, RegisterGuestDto, VerifyCodeDto } from '../dto';
import { GuestJwtAuthGuard } from '../../infrastructure/guards/guest-jwt-auth.guard';
import { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/cookie';

@Controller('auth/guest')
export class GuestController {
  constructor(
    private readonly registerGuestUseCase: RegisterGuestUseCase,
    private readonly loginGuestUseCase: LoginGuestUseCase,
    private readonly verifyLoginUseCase: VerifyLoginUseCase,
    private readonly verifyRegisterUseCase: VerifyRegisterUseCase,
    private readonly getCurrentGuestUseCase: GetCurrentGuestUseCase,
    private readonly refreshGuestTokenUseCase: RefreshGuestTokenUseCase,
    private readonly guestLogoutUseCase: GuestLogoutUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(201)
  async registerGuest(@Body() dto: RegisterGuestDto) {
    return this.registerGuestUseCase.execute(dto);
  }

  @Post('login')
  @HttpCode(200)
  async loginGuest(@Body() dto: LoginGuestDto) {
    const result = await this.loginGuestUseCase.execute(dto);
    return { message: result.message };
  }

  @Post('verify/login')
  @HttpCode(200)
  async verifyLogin(
    @Body() dto: VerifyCodeDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.verifyLoginUseCase.execute(dto.code);
    this.setGuestRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      guest: result.guest,
      accessToken: result.tokens.accessToken,
    };
  }

  @Post('verify/register')
  @HttpCode(200)
  async verifyRegister(
    @Body() dto: VerifyCodeDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.verifyRegisterUseCase.execute(dto.code);
    this.setGuestRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      guest: result.guest,
      accessToken: result.tokens.accessToken,
    };
  }

  @UseGuards(GuestRefreshTokenGuard)
  @Post('refresh')
  @HttpCode(200)
  async handleRefreshToken(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies['guest_refresh_token'];
    const result = await this.refreshGuestTokenUseCase.execute({
      refreshToken,
    });

    // Set new refresh token cookie
    this.setGuestRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
    };
  }

  @UseGuards(GuestRefreshTokenGuard)
  @Post('check')
  @HttpCode(200)
  async handleCheckAuth(@Req() req: FastifyRequest) {
    return {
      success: true,
    };
  }

  @UseGuards(GuestRefreshTokenGuard)
  @Post('logout')
  @HttpCode(200)
  async handleLogout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies['guest_refresh_token'];

    // Revoke the refresh token
    await this.guestLogoutUseCase.execute({ refreshToken });

    // Clear the cookie
    res.clearCookie('guest_refresh_token');
    return { success: true };
  }

  @UseGuards(GuestJwtAuthGuard)
  @Get('me')
  @HttpCode(200)
  async getCurrentGuest(@Req() req: any): Promise<any> {
    const guestId = req.user.id;
    if (!guestId) {
      throw new Error('Guest ID not found in request');
    }

    return await this.getCurrentGuestUseCase.execute({ guestId });
  }

  private setGuestRefreshTokenCookie(res: FastifyReply, token: string) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const COOKIE_SAMESITE = this.config.get('COOKIES_SAMESITE', 'strict');
    const COOKIE_SECURE = this.config.get('COOKIES_SECURE', true);

    res.setCookie('guest_refresh_token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      expires: expiryDate,
      path: '/',
    });
  }
}

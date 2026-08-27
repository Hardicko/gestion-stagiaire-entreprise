import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';

import { SWAGGER_BEARER_NAME } from '../config/swagger.config';
import { DEFAULT_REFRESH_TOKEN_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import { AllowPasswordChangeRequired } from './decorators/password-change/allow-password-change-required.decorator';
import { ChangePasswordDto } from './dto/change-password.dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { SessionContext } from './interfaces/session-context.interface';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      loginDto,
      this.createSessionContext(request),
    );

    return this.deliverTokens(result, response);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(
      this.extractRefreshToken(request, refreshTokenDto),
      this.createSessionContext(request),
    );

    return this.deliverTokens(result, response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(
      this.extractRefreshToken(request, refreshTokenDto),
    );

    response.clearCookie(
      this.getRefreshCookieName(),
      this.getRefreshCookieOptions(),
    );

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @AllowPasswordChangeRequired()
  @ApiBearerAuth(SWAGGER_BEARER_NAME)
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.sub);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @AllowPasswordChangeRequired()
  @ApiBearerAuth(SWAGGER_BEARER_NAME)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(request.user.sub, changePasswordDto);
  }

  private deliverTokens<
    T extends {
      refreshToken: string;
      refreshExpiresIn: number;
    },
  >(result: T, response: Response) {
    response.cookie(this.getRefreshCookieName(), result.refreshToken, {
      ...this.getRefreshCookieOptions(),
      maxAge: result.refreshExpiresIn * 1000,
    });

    const { refreshToken, ...publicResult } = result;

    return this.configService.get<string>('AUTH_EXPOSE_REFRESH_TOKEN') ===
      'true'
      ? { ...publicResult, refreshToken }
      : publicResult;
  }

  private extractRefreshToken(
    request: Request,
    refreshTokenDto: RefreshTokenDto,
  ) {
    return (
      refreshTokenDto.refreshToken ??
      this.readCookie(request, this.getRefreshCookieName())
    );
  }

  private readCookie(request: Request, cookieName: string) {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    for (const part of cookieHeader.split(';')) {
      const separatorIndex = part.indexOf('=');

      if (separatorIndex < 0) {
        continue;
      }

      const name = part.slice(0, separatorIndex).trim();

      if (name !== cookieName) {
        continue;
      }

      const value = part.slice(separatorIndex + 1).trim();

      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }

    return undefined;
  }

  private createSessionContext(request: Request): SessionContext {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }

  private getRefreshCookieName() {
    return (
      this.configService.get<string>('AUTH_REFRESH_COOKIE_NAME') ??
      DEFAULT_REFRESH_TOKEN_COOKIE_NAME
    );
  }

  private getRefreshCookieOptions(): CookieOptions {
    const configuredSameSite = (
      this.configService.get<string>('AUTH_COOKIE_SAME_SITE') ?? 'lax'
    ).toLowerCase();
    const sameSite: 'lax' | 'strict' | 'none' = [
      'lax',
      'strict',
      'none',
    ].includes(configuredSameSite)
      ? (configuredSameSite as 'lax' | 'strict' | 'none')
      : 'lax';
    const configuredSecure =
      this.configService.get<string>('AUTH_COOKIE_SECURE') === 'true';

    return {
      httpOnly: true,
      secure: sameSite === 'none' || configuredSecure,
      sameSite,
      path: '/auth',
    };
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { SWAGGER_BEARER_NAME } from '../config/swagger.config';
import { AuthService } from './auth.service';
import { AllowPasswordChangeRequired } from './decorators/password-change/allow-password-change-required.decorator';
import { ChangePasswordDto } from './dto/change-password.dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
}

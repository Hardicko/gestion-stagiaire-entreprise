import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../auth/decorators/permissions/require-permissions.decorator';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions/permissions.guard';
import { PERMISSIONS } from '../auth/permissions.constants';
import { SWAGGER_BEARER_NAME } from '../config/swagger.config';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('Utilisateurs')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id/reset-password')
  @RequirePermissions(PERMISSIONS.USERS_RESET_PASSWORD)
  resetPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() resetPasswordDto: ResetUserPasswordDto,
  ) {
    return this.userService.resetPassword(id, resetPasswordDto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userService.update(id, updateUserDto, request.user.sub);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DEACTIVATE)
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userService.remove(id, request.user.sub);
  }
}

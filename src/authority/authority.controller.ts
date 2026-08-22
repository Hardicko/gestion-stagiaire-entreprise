import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../auth/decorators/permissions/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions/permissions.guard';
import { PERMISSIONS } from '../auth/permissions.constants';
import { SWAGGER_BEARER_NAME } from '../config/swagger.config';
import { AuthorityService } from './authority.service';
import { CreateAuthorityDto } from './dto/create-authority.dto';
import { UpdateAuthorityDto } from './dto/update-authority.dto';

@ApiTags('Autorités')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('authorities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuthorityController {
  constructor(private readonly authorityService: AuthorityService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.AUTHORITIES_CREATE)
  create(@Body() createAuthorityDto: CreateAuthorityDto) {
    return this.authorityService.create(createAuthorityDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.AUTHORITIES_READ)
  findAll() {
    return this.authorityService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.AUTHORITIES_READ)
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.authorityService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.AUTHORITIES_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateAuthorityDto: UpdateAuthorityDto,
  ) {
    return this.authorityService.update(id, updateAuthorityDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.AUTHORITIES_DEACTIVATE)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.authorityService.remove(id);
  }
}

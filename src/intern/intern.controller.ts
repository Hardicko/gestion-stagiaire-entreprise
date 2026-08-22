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
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';
import { InternService } from './intern.service';

@ApiTags('Stagiaires')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('interns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InternController {
  constructor(private readonly internService: InternService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.INTERNS_CREATE)
  create(@Body() createInternDto: CreateInternDto) {
    return this.internService.create(createInternDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.INTERNS_READ)
  findAll() {
    return this.internService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INTERNS_READ)
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.internService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.INTERNS_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateInternDto: UpdateInternDto,
  ) {
    return this.internService.update(id, updateInternDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.INTERNS_DEACTIVATE)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.internService.remove(id);
  }
}

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
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { UpdateSupervisorDto } from './dto/update-supervisor.dto';
import { SupervisorService } from './supervisor.service';

@ApiTags('Encadreurs')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('supervisors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SUPERVISORS_CREATE)
  create(@Body() createSupervisorDto: CreateSupervisorDto) {
    return this.supervisorService.create(createSupervisorDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SUPERVISORS_READ)
  findAll() {
    return this.supervisorService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SUPERVISORS_READ)
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.supervisorService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SUPERVISORS_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateSupervisorDto: UpdateSupervisorDto,
  ) {
    return this.supervisorService.update(id, updateSupervisorDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SUPERVISORS_DEACTIVATE)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.supervisorService.remove(id);
  }
}

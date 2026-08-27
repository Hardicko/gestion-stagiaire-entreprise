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
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@ApiTags('Projets')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECTS_CREATE)
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECTS_READ)
  findAll() {
    return this.projectService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS_READ)
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PROJECTS_DEACTIVATE)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.projectService.remove(id);
  }
}

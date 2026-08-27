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
import { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';
import { UpdateProjectAssignmentDto } from './dto/update-project-assignment.dto';
import { ProjectAssignmentService } from './project-assignment.service';

@ApiTags('Affectations de projets')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('project-assignments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectAssignmentController {
  constructor(
    private readonly projectAssignmentService: ProjectAssignmentService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_ASSIGNMENTS_CREATE)
  create(@Body() createDto: CreateProjectAssignmentDto) {
    return this.projectAssignmentService.create(createDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECT_ASSIGNMENTS_READ)
  findAll() {
    return this.projectAssignmentService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PROJECT_ASSIGNMENTS_READ)
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.projectAssignmentService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROJECT_ASSIGNMENTS_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateProjectAssignmentDto,
  ) {
    return this.projectAssignmentService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PROJECT_ASSIGNMENTS_DEACTIVATE)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.projectAssignmentService.remove(id);
  }
}

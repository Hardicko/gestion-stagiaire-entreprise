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

import { Roles } from '../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';
import { UpdateProjectAssignmentDto } from './dto/update-project-assignment.dto';
import { ProjectAssignmentService } from './project-assignment.service';

@Controller('project-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectAssignmentController {
  constructor(
    private readonly projectAssignmentService: ProjectAssignmentService,
  ) {}

  @Post()
  @Roles('ADMINISTRATEUR')
  create(@Body() createDto: CreateProjectAssignmentDto) {
    return this.projectAssignmentService.create(createDto);
  }

  @Get()
  findAll() {
    return this.projectAssignmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.projectAssignmentService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRATEUR')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateProjectAssignmentDto,
  ) {
    return this.projectAssignmentService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRATEUR')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.projectAssignmentService.remove(id);
  }
}

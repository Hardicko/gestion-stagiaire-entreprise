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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Départements')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_CREATE)
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_READ)
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_READ)
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.departmentService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_DEACTIVATE)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.departmentService.remove(id);
  }
}

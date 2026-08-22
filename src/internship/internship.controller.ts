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
import { CreateInternshipDto } from './dto/create-internship.dto';
import { UpdateInternshipDto } from './dto/update-internship.dto';
import { InternshipService } from './internship.service';

@ApiTags('Stages')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('internships')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InternshipController {
  constructor(private readonly internshipService: InternshipService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.INTERNSHIPS_CREATE)
  create(@Body() createInternshipDto: CreateInternshipDto) {
    return this.internshipService.create(createInternshipDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.INTERNSHIPS_READ)
  findAll() {
    return this.internshipService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INTERNSHIPS_READ)
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.internshipService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.INTERNSHIPS_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateInternshipDto: UpdateInternshipDto,
  ) {
    return this.internshipService.update(id, updateInternshipDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.INTERNSHIPS_DEACTIVATE)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.internshipService.remove(id);
  }
}

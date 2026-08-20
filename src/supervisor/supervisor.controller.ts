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
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { UpdateSupervisorDto } from './dto/update-supervisor.dto';
import { SupervisorService } from './supervisor.service';

@Controller('supervisors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Post()
  @Roles('ADMINISTRATEUR')
  create(@Body() createSupervisorDto: CreateSupervisorDto) {
    return this.supervisorService.create(createSupervisorDto);
  }

  @Get()
  findAll() {
    return this.supervisorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.supervisorService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRATEUR')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateSupervisorDto: UpdateSupervisorDto,
  ) {
    return this.supervisorService.update(id, updateSupervisorDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRATEUR')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.supervisorService.remove(id);
  }
}

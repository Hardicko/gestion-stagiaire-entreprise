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

import { Roles } from '../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { SWAGGER_BEARER_NAME } from '../config/swagger.config';
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';
import { InternService } from './intern.service';

@ApiTags('Stagiaires')
@ApiBearerAuth(SWAGGER_BEARER_NAME)
@Controller('interns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InternController {
  constructor(private readonly internService: InternService) {}

  @Post()
  @Roles('ADMINISTRATEUR')
  create(@Body() createInternDto: CreateInternDto) {
    return this.internService.create(createInternDto);
  }

  @Get()
  findAll() {
    return this.internService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.internService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRATEUR')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateInternDto: UpdateInternDto,
  ) {
    return this.internService.update(id, updateInternDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRATEUR')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.internService.remove(id);
  }
}

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
import { CreateInternshipDto } from './dto/create-internship.dto';
import { UpdateInternshipDto } from './dto/update-internship.dto';
import { InternshipService } from './internship.service';

@Controller('internships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InternshipController {
  constructor(private readonly internshipService: InternshipService) {}

  @Post()
  @Roles('ADMINISTRATEUR')
  create(@Body() createInternshipDto: CreateInternshipDto) {
    return this.internshipService.create(createInternshipDto);
  }

  @Get()
  findAll() {
    return this.internshipService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.internshipService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRATEUR')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateInternshipDto: UpdateInternshipDto,
  ) {
    return this.internshipService.update(id, updateInternshipDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRATEUR')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.internshipService.remove(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SupervisorService } from './supervisor.service';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { UpdateSupervisorDto } from './dto/update-supervisor.dto';

@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Post()
  create(@Body() createSupervisorDto: CreateSupervisorDto) {
    return this.supervisorService.create(createSupervisorDto);
  }

  @Get()
  findAll() {
    return this.supervisorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supervisorService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupervisorDto: UpdateSupervisorDto,
  ) {
    return this.supervisorService.update(+id, updateSupervisorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supervisorService.remove(+id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InternService } from './intern.service';
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';

@Controller('intern')
export class InternController {
  constructor(private readonly internService: InternService) {}

  @Post()
  create(@Body() createInternDto: CreateInternDto) {
    return this.internService.create(createInternDto);
  }

  @Get()
  findAll() {
    return this.internService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.internService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInternDto: UpdateInternDto) {
    return this.internService.update(+id, updateInternDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.internService.remove(+id);
  }
}

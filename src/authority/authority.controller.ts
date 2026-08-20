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
import { AuthorityService } from './authority.service';
import { CreateAuthorityDto } from './dto/create-authority.dto';
import { UpdateAuthorityDto } from './dto/update-authority.dto';

@Controller('authorities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthorityController {
  constructor(private readonly authorityService: AuthorityService) {}

  @Post()
  @Roles('ADMINISTRATEUR')
  create(@Body() createAuthorityDto: CreateAuthorityDto) {
    return this.authorityService.create(createAuthorityDto);
  }

  @Get()
  findAll() {
    return this.authorityService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.authorityService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRATEUR')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateAuthorityDto: UpdateAuthorityDto,
  ) {
    return this.authorityService.update(id, updateAuthorityDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRATEUR')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.authorityService.remove(id);
  }
}

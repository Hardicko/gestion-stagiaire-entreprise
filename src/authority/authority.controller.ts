import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthorityService } from './authority.service';
import { CreateAuthorityDto } from './dto/create-authority.dto';
import { UpdateAuthorityDto } from './dto/update-authority.dto';

@Controller('authority')
export class AuthorityController {
  constructor(private readonly authorityService: AuthorityService) {}

  @Post()
  create(@Body() createAuthorityDto: CreateAuthorityDto) {
    return this.authorityService.create(createAuthorityDto);
  }

  @Get()
  findAll() {
    return this.authorityService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authorityService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAuthorityDto: UpdateAuthorityDto,
  ) {
    return this.authorityService.update(+id, updateAuthorityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authorityService.remove(+id);
  }
}

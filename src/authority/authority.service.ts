import { Injectable } from '@nestjs/common';
import { CreateAuthorityDto } from './dto/create-authority.dto';
import { UpdateAuthorityDto } from './dto/update-authority.dto';

@Injectable()
export class AuthorityService {
  create(createAuthorityDto: CreateAuthorityDto) {
    return 'This action adds a new authority';
  }

  findAll() {
    return `This action returns all authority`;
  }

  findOne(id: number) {
    return `This action returns a #${id} authority`;
  }

  update(id: number, updateAuthorityDto: UpdateAuthorityDto) {
    return `This action updates a #${id} authority`;
  }

  remove(id: number) {
    return `This action removes a #${id} authority`;
  }
}

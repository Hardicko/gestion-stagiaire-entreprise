import { Injectable } from '@nestjs/common';
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';

@Injectable()
export class InternService {
  create(createInternDto: CreateInternDto) {
    return 'This action adds a new intern';
  }

  findAll() {
    return `This action returns all intern`;
  }

  findOne(id: number) {
    return `This action returns a #${id} intern`;
  }

  update(id: number, updateInternDto: UpdateInternDto) {
    return `This action updates a #${id} intern`;
  }

  remove(id: number) {
    return `This action removes a #${id} intern`;
  }
}

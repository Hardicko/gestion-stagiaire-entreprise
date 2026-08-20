import { Injectable } from '@nestjs/common';
import { CreateInternshipDto } from './dto/create-internship.dto';
import { UpdateInternshipDto } from './dto/update-internship.dto';

@Injectable()
export class InternshipService {
  create(createInternshipDto: CreateInternshipDto) {
    return 'This action adds a new internship';
  }

  findAll() {
    return `This action returns all internship`;
  }

  findOne(id: number) {
    return `This action returns a #${id} internship`;
  }

  update(id: number, updateInternshipDto: UpdateInternshipDto) {
    return `This action updates a #${id} internship`;
  }

  remove(id: number) {
    return `This action removes a #${id} internship`;
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const name = createDepartmentDto.name.trim();
    const code = createDepartmentDto.code.trim().toUpperCase();
    const description = createDepartmentDto.description?.trim();

    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        OR: [{ name }, { code }],
      },
    });

    if (existingDepartment) {
      throw new ConflictException(
        'Un département avec le même nom ou le même code existe déjà.',
      );
    }

    return this.prisma.department.create({
      data: {
        name,
        code,
        ...(description !== undefined && { description }),
        isActive: createDepartmentDto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.department.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Département introuvable.');
    }

    return department;
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ) {
    await this.findOne(id);

    const name = updateDepartmentDto.name?.trim();
    const code = updateDepartmentDto.code?.trim().toUpperCase();
    const description = updateDepartmentDto.description?.trim();

    if (name !== undefined || code !== undefined) {
      const existingDepartment =
        await this.prisma.department.findFirst({
          where: {
            id: {
              not: id,
            },
            OR: [
              ...(name !== undefined ? [{ name }] : []),
              ...(code !== undefined ? [{ code }] : []),
            ],
          },
        });

      if (existingDepartment) {
        throw new ConflictException(
          'Un département avec le même nom ou le même code existe déjà.',
        );
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(updateDepartmentDto.isActive !== undefined && {
          isActive: updateDepartmentDto.isActive,
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.department.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
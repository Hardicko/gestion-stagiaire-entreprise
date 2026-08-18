import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const name = createRoleDto.name.trim().toUpperCase();
    const description = createRoleDto.description?.trim();

    const existingRole = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      throw new ConflictException('Ce rôle existe déjà.');
    }

    return this.prisma.role.create({
      data: {
        name,
        ...(description !== undefined && { description }),
        isActive: createRoleDto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Rôle introuvable.');
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);

    const name = updateRoleDto.name?.trim().toUpperCase();
    const description = updateRoleDto.description?.trim();

    if (name !== undefined) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name,
          id: {
            not: id,
          },
        },
      });

      if (existingRole) {
        throw new ConflictException('Ce rôle existe déjà.');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(updateRoleDto.isActive !== undefined && {
          isActive: updateRoleDto.isActive,
        }),
      },
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);

    if (!role.isActive) {
      throw new ConflictException('Ce rôle est déjà désactivé.');
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
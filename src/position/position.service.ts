import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly employeeCount = {
    select: {
      employees: {
        where: {
          isActive: true,
        },
      },
    },
  } as const;

  async create(createPositionDto: CreatePositionDto) {
    const code = createPositionDto.code.trim().toUpperCase();
    const name = createPositionDto.name.trim();
    const description = createPositionDto.description?.trim() || null;

    const existingPosition = await this.prisma.position.findFirst({
      where: {
        OR: [{ code }, { name }],
      },
    });

    if (existingPosition) {
      throw new ConflictException(
        'Un poste avec le même nom ou le même code existe déjà.',
      );
    }

    return this.prisma.position.create({
      data: {
        code,
        name,
        description,
        isActive: createPositionDto.isActive ?? true,
      },
      include: {
        _count: this.employeeCount,
      },
    });
  }

  async findAll() {
    return this.prisma.position.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: this.employeeCount,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        _count: this.employeeCount,
      },
    });

    if (!position) {
      throw new NotFoundException('Poste introuvable.');
    }

    return position;
  }

  async update(id: string, updatePositionDto: UpdatePositionDto) {
    await this.findOne(id);

    const code = updatePositionDto.code?.trim().toUpperCase();
    const name = updatePositionDto.name?.trim();
    const description =
      updatePositionDto.description !== undefined
        ? updatePositionDto.description.trim() || null
        : undefined;

    if (code !== undefined || name !== undefined) {
      const existingPosition = await this.prisma.position.findFirst({
        where: {
          id: {
            not: id,
          },
          OR: [
            ...(code !== undefined ? [{ code }] : []),
            ...(name !== undefined ? [{ name }] : []),
          ],
        },
      });

      if (existingPosition) {
        throw new ConflictException(
          'Un poste avec le même nom ou le même code existe déjà.',
        );
      }
    }

    return this.prisma.position.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(updatePositionDto.isActive !== undefined && {
          isActive: updatePositionDto.isActive,
        }),
      },
      include: {
        _count: this.employeeCount,
      },
    });
  }

  async remove(id: string) {
    const position = await this.findOne(id);

    if (!position.isActive) {
      throw new ConflictException('Ce poste est déjà désactivé.');
    }

    const activeEmployees = await this.prisma.employee.count({
      where: {
        positionId: id,
        isActive: true,
      },
    });

    if (activeEmployees > 0) {
      throw new ConflictException(
        'Ce poste est encore attribué à un ou plusieurs employés actifs.',
      );
    }

    return this.prisma.position.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        _count: this.employeeCount,
      },
    });
  }
}

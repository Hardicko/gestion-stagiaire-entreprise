import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthorityDto } from './dto/create-authority.dto';
import { UpdateAuthorityDto } from './dto/update-authority.dto';

@Injectable()
export class AuthorityService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyEmployee(employeeId: string): Promise<void> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        isActive: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'L’employé indiqué est introuvable ou inactif.',
      );
    }
  }

  private async verifyDepartment(departmentId: string): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        isActive: true,
      },
    });

    if (!department) {
      throw new NotFoundException(
        'Le département indiqué est introuvable ou inactif.',
      );
    }
  }

  async create(createAuthorityDto: CreateAuthorityDto) {
    await this.verifyEmployee(createAuthorityDto.employeeId);

    if (createAuthorityDto.departmentId) {
      await this.verifyDepartment(createAuthorityDto.departmentId);
    }

    const email = createAuthorityDto.email.trim().toLowerCase();

    const existingAuthority = await this.prisma.authority.findFirst({
      where: {
        OR: [{ employeeId: createAuthorityDto.employeeId }, { email }],
      },
    });

    if (existingAuthority) {
      throw new ConflictException(
        'Une autorité avec cet employé ou cet email existe déjà.',
      );
    }

    return this.prisma.authority.create({
      data: {
        employeeId: createAuthorityDto.employeeId,
        departmentId: createAuthorityDto.departmentId ?? null,
        name: createAuthorityDto.name.trim(),
        email,
        signingTitle: createAuthorityDto.signingTitle.trim(),
        isActive: createAuthorityDto.isActive ?? true,
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
    });
  }

  async findAll() {
    return this.prisma.authority.findMany({
      where: {
        isActive: true,
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const authority = await this.prisma.authority.findUnique({
      where: {
        id,
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
    });

    if (!authority) {
      throw new NotFoundException('Autorité signataire introuvable.');
    }

    return authority;
  }

  async update(id: string, updateAuthorityDto: UpdateAuthorityDto) {
    await this.findOne(id);

    if (updateAuthorityDto.employeeId !== undefined) {
      await this.verifyEmployee(updateAuthorityDto.employeeId);
    }

    if (
      updateAuthorityDto.departmentId !== undefined &&
      updateAuthorityDto.departmentId !== null
    ) {
      await this.verifyDepartment(updateAuthorityDto.departmentId);
    }

    const email = updateAuthorityDto.email?.trim().toLowerCase();

    if (updateAuthorityDto.employeeId !== undefined || email !== undefined) {
      const existingAuthority = await this.prisma.authority.findFirst({
        where: {
          id: {
            not: id,
          },
          OR: [
            ...(updateAuthorityDto.employeeId !== undefined
              ? [{ employeeId: updateAuthorityDto.employeeId }]
              : []),
            ...(email !== undefined ? [{ email }] : []),
          ],
        },
      });

      if (existingAuthority) {
        throw new ConflictException(
          'Une autorité avec cet employé ou cet email existe déjà.',
        );
      }
    }

    return this.prisma.authority.update({
      where: {
        id,
      },
      data: {
        ...(updateAuthorityDto.employeeId !== undefined && {
          employeeId: updateAuthorityDto.employeeId,
        }),
        ...(updateAuthorityDto.departmentId !== undefined && {
          departmentId: updateAuthorityDto.departmentId,
        }),
        ...(updateAuthorityDto.name !== undefined && {
          name: updateAuthorityDto.name.trim(),
        }),
        ...(email !== undefined && { email }),
        ...(updateAuthorityDto.signingTitle !== undefined && {
          signingTitle: updateAuthorityDto.signingTitle.trim(),
        }),
        ...(updateAuthorityDto.isActive !== undefined && {
          isActive: updateAuthorityDto.isActive,
        }),
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
    });
  }

  async remove(id: string) {
    const authority = await this.findOne(id);

    if (!authority.isActive) {
      throw new ConflictException(
        'Cette autorité signataire est déjà désactivée.',
      );
    }

    const activeInternships = await this.prisma.internship.count({
      where: {
        authorityId: id,
        isActive: true,
        status: {
          in: ['PLANNED', 'ONGOING'],
        },
      },
    });

    if (activeInternships > 0) {
      throw new ConflictException(
        'Cette autorité est encore associée à un stage planifié ou en cours.',
      );
    }

    return this.prisma.authority.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
    });
  }
}

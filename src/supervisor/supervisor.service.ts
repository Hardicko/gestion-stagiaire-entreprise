import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { UpdateSupervisorDto } from './dto/update-supervisor.dto';

@Injectable()
export class SupervisorService {
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

  async create(createSupervisorDto: CreateSupervisorDto) {
    await this.verifyEmployee(createSupervisorDto.employeeId);

    const existingSupervisor = await this.prisma.supervisor.findUnique({
      where: {
        employeeId: createSupervisorDto.employeeId,
      },
    });

    if (existingSupervisor) {
      throw new ConflictException(
        'Cet employé possède déjà un profil de maître de stage.',
      );
    }

    return this.prisma.supervisor.create({
      data: {
        employeeId: createSupervisorDto.employeeId,
        isActive: createSupervisorDto.isActive ?? true,
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.supervisor.findMany({
      where: {
        isActive: true,
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
      orderBy: {
        employee: {
          lastName: 'asc',
        },
      },
    });
  }

  async findOne(id: string) {
    const supervisor = await this.prisma.supervisor.findUnique({
      where: {
        id,
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });

    if (!supervisor) {
      throw new NotFoundException('Maître de stage introuvable.');
    }

    return supervisor;
  }

  async update(id: string, updateSupervisorDto: UpdateSupervisorDto) {
    await this.findOne(id);

    if (updateSupervisorDto.employeeId !== undefined) {
      await this.verifyEmployee(updateSupervisorDto.employeeId);

      const existingSupervisor = await this.prisma.supervisor.findFirst({
        where: {
          id: {
            not: id,
          },
          employeeId: updateSupervisorDto.employeeId,
        },
      });

      if (existingSupervisor) {
        throw new ConflictException(
          'Cet employé possède déjà un profil de maître de stage.',
        );
      }
    }

    return this.prisma.supervisor.update({
      where: {
        id,
      },
      data: {
        ...(updateSupervisorDto.employeeId !== undefined && {
          employeeId: updateSupervisorDto.employeeId,
        }),
        ...(updateSupervisorDto.isActive !== undefined && {
          isActive: updateSupervisorDto.isActive,
        }),
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const supervisor = await this.findOne(id);

    if (!supervisor.isActive) {
      throw new ConflictException('Ce maître de stage est déjà désactivé.');
    }

    const activeInternships = await this.prisma.internship.count({
      where: {
        supervisorId: id,
        isActive: true,
        status: {
          in: ['PLANNED', 'ONGOING'],
        },
      },
    });

    if (activeInternships > 0) {
      throw new ConflictException(
        'Ce maître de stage possède encore un stage planifié ou en cours.',
      );
    }

    return this.prisma.supervisor.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProjectStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value: string, fieldName: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} est invalide.`);
    }

    return date;
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        'La date de fin doit être postérieure ou égale à la date de début.',
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

  async create(createProjectDto: CreateProjectDto) {
    const startDate = this.parseDate(
      createProjectDto.startDate,
      'La date de début',
    );
    const endDate = this.parseDate(createProjectDto.endDate, 'La date de fin');

    this.validateDateRange(startDate, endDate);
    await this.verifyDepartment(createProjectDto.departmentId);

    for (
      let transactionAttempt = 0;
      transactionAttempt < 3;
      transactionAttempt++
    ) {
      try {
        return await this.prisma.$transaction(async (transaction) => {
          const year = new Date().getUTCFullYear();

          for (let skippedCodes = 0; skippedCodes < 1000; skippedCodes++) {
            const sequence = await transaction.projectCodeSequence.upsert({
              where: { year },
              create: {
                year,
                lastValue: 1,
              },
              update: {
                lastValue: {
                  increment: 1,
                },
              },
            });
            const projectCode = `PRJ-${year}-${String(
              sequence.lastValue,
            ).padStart(4, '0')}`;
            const existingProject = await transaction.project.findUnique({
              where: { projectCode },
              select: { id: true },
            });

            if (existingProject) {
              continue;
            }

            return transaction.project.create({
              data: {
                projectCode,
                name: createProjectDto.name.trim(),
                description: createProjectDto.description?.trim() || null,
                gitlabLink: createProjectDto.gitlabLink?.trim() || null,
                startDate,
                endDate,
                status: createProjectDto.status ?? ProjectStatus.PLANNED,
                departmentId: createProjectDto.departmentId,
                isActive: createProjectDto.isActive ?? true,
              },
              include: {
                department: true,
              },
            });
          }

          throw new ConflictException(
            'Impossible de réserver un code projet disponible.',
          );
        });
      } catch (error) {
        const isConcurrentCodeCollision =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002';

        if (!isConcurrentCodeCollision || transactionAttempt === 2) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Impossible de réserver un code projet disponible.',
    );
  }

  async findAll() {
    return this.prisma.project.findMany({
      where: {
        isActive: true,
      },
      include: {
        department: true,
        _count: {
          select: {
            projectAssignments: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        department: true,
        projectAssignments: {
          include: {
            internship: {
              include: {
                intern: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable.');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const currentProject = await this.findOne(id);

    const startDate =
      updateProjectDto.startDate !== undefined
        ? this.parseDate(updateProjectDto.startDate, 'La date de début')
        : currentProject.startDate;
    const endDate =
      updateProjectDto.endDate !== undefined
        ? this.parseDate(updateProjectDto.endDate, 'La date de fin')
        : currentProject.endDate;
    const status = updateProjectDto.status ?? currentProject.status;

    this.validateDateRange(startDate, endDate);

    if (
      updateProjectDto.isActive === false &&
      status === ProjectStatus.ONGOING
    ) {
      throw new ConflictException(
        'Un projet en cours doit être terminé ou annulé avant sa désactivation.',
      );
    }

    if (updateProjectDto.departmentId !== undefined) {
      await this.verifyDepartment(updateProjectDto.departmentId);
    }

    const description =
      updateProjectDto.description !== undefined
        ? updateProjectDto.description?.trim() || null
        : undefined;
    const gitlabLink =
      updateProjectDto.gitlabLink !== undefined
        ? updateProjectDto.gitlabLink?.trim() || null
        : undefined;

    return this.prisma.project.update({
      where: {
        id,
      },
      data: {
        ...(updateProjectDto.name !== undefined && {
          name: updateProjectDto.name.trim(),
        }),
        ...(description !== undefined && { description }),
        ...(gitlabLink !== undefined && { gitlabLink }),
        ...(updateProjectDto.startDate !== undefined && { startDate }),
        ...(updateProjectDto.endDate !== undefined && { endDate }),
        ...(updateProjectDto.status !== undefined && {
          status: updateProjectDto.status,
        }),
        ...(updateProjectDto.departmentId !== undefined && {
          departmentId: updateProjectDto.departmentId,
        }),
        ...(updateProjectDto.isActive !== undefined && {
          isActive: updateProjectDto.isActive,
        }),
      },
      include: {
        department: true,
      },
    });
  }

  async remove(id: string) {
    const project = await this.findOne(id);

    if (!project.isActive) {
      throw new ConflictException('Ce projet est déjà désactivé.');
    }

    if (project.status === ProjectStatus.ONGOING) {
      throw new ConflictException(
        'Un projet en cours doit être terminé ou annulé avant sa désactivation.',
      );
    }

    const activeAssignments = await this.prisma.projectAssignment.count({
      where: {
        projectId: id,
        status: {
          in: ['ASSIGNED', 'IN_PROGRESS'],
        },
      },
    });

    if (activeAssignments > 0) {
      throw new ConflictException(
        'Ce projet possède encore des affectations actives.',
      );
    }

    return this.prisma.project.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      include: {
        department: true,
      },
    });
  }
}

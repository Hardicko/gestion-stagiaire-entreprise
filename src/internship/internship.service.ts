import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client';
import {
  AssignmentStatus,
  InternshipStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInternshipDto } from './dto/create-internship.dto';
import { InternshipTrackingQueryDto } from './dto/internship-tracking-query.dto';
import { UpdateInternshipDto } from './dto/update-internship.dto';

@Injectable()
export class InternshipService {
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

  private async verifyIntern(internId: string): Promise<void> {
    const intern = await this.prisma.intern.findFirst({
      where: {
        id: internId,
        isActive: true,
      },
    });

    if (!intern) {
      throw new NotFoundException(
        'Le stagiaire indiqué est introuvable ou inactif.',
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

  private async verifySupervisor(supervisorId: string): Promise<void> {
    const supervisor = await this.prisma.supervisor.findFirst({
      where: {
        id: supervisorId,
        isActive: true,
        employee: {
          isActive: true,
        },
      },
    });

    if (!supervisor) {
      throw new NotFoundException(
        'Le maître de stage indiqué est introuvable ou inactif.',
      );
    }
  }

  private async verifyAuthority(authorityId: string): Promise<void> {
    const authority = await this.prisma.authority.findFirst({
      where: {
        id: authorityId,
        isActive: true,
        employee: {
          isActive: true,
        },
      },
    });

    if (!authority) {
      throw new NotFoundException(
        'L’autorité signataire indiquée est introuvable ou inactive.',
      );
    }
  }

  private async verifyRelations(
    internId: string,
    departmentId: string,
    supervisorId: string,
    authorityId: string | null,
  ): Promise<void> {
    await this.verifyIntern(internId);
    await this.verifyDepartment(departmentId);
    await this.verifySupervisor(supervisorId);

    if (authorityId) {
      await this.verifyAuthority(authorityId);
    }
  }

  private async verifyNoOverlap(
    internId: string,
    startDate: Date,
    endDate: Date,
    excludedId?: string,
  ): Promise<void> {
    const overlappingInternship = await this.prisma.internship.findFirst({
      where: {
        ...(excludedId !== undefined && {
          id: {
            not: excludedId,
          },
        }),
        internId,
        isActive: true,
        status: {
          not: InternshipStatus.CANCELLED,
        },
        startDate: {
          lte: endDate,
        },
        endDate: {
          gte: startDate,
        },
      },
    });

    if (overlappingInternship) {
      throw new ConflictException(
        'Ce stagiaire possède déjà un stage sur cette période.',
      );
    }
  }

  async create(createInternshipDto: CreateInternshipDto) {
    const referenceCode = createInternshipDto.referenceCode
      .trim()
      .toUpperCase();
    const startDate = this.parseDate(
      createInternshipDto.startDate,
      'La date de début',
    );
    const endDate = this.parseDate(
      createInternshipDto.endDate,
      'La date de fin',
    );
    const status = createInternshipDto.status ?? InternshipStatus.PLANNED;

    this.validateDateRange(startDate, endDate);

    await this.verifyRelations(
      createInternshipDto.internId,
      createInternshipDto.departmentId,
      createInternshipDto.supervisorId,
      createInternshipDto.authorityId ?? null,
    );

    const existingInternship = await this.prisma.internship.findUnique({
      where: {
        referenceCode,
      },
    });

    if (existingInternship) {
      throw new ConflictException('Cette référence de stage existe déjà.');
    }

    if (status !== InternshipStatus.CANCELLED) {
      await this.verifyNoOverlap(
        createInternshipDto.internId,
        startDate,
        endDate,
      );
    }

    return this.prisma.internship.create({
      data: {
        referenceCode,
        title: createInternshipDto.title.trim(),
        description: createInternshipDto.description?.trim() || null,
        startDate,
        endDate,
        status,
        internshipType: createInternshipDto.internshipType,
        monthlyAllowance: createInternshipDto.monthlyAllowance ?? null,
        currency: createInternshipDto.currency?.trim().toUpperCase() ?? 'XOF',
        workLocation: createInternshipDto.workLocation.trim(),
        internId: createInternshipDto.internId,
        departmentId: createInternshipDto.departmentId,
        supervisorId: createInternshipDto.supervisorId,
        authorityId: createInternshipDto.authorityId ?? null,
        grade: createInternshipDto.grade ?? null,
        isActive: createInternshipDto.isActive ?? true,
      },
      include: {
        intern: true,
        department: true,
        supervisor: {
          include: {
            employee: true,
          },
        },
        authority: {
          include: {
            employee: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.internship.findMany({
      where: {
        isActive: true,
      },
      include: {
        intern: true,
        department: true,
        supervisor: {
          include: {
            employee: true,
          },
        },
        authority: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async getTracking(query: InternshipTrackingQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.q?.trim();
    const where: Prisma.InternshipWhereInput = {
      isActive: true,
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.internshipStatus && { status: query.internshipStatus }),
      ...(query.projectStatus && {
        projectAssignments: {
          some: {
            status: { not: AssignmentStatus.REMOVED },
            project: {
              is: {
                isActive: true,
                status: query.projectStatus,
              },
            },
          },
        },
      }),
      ...(search && {
        OR: [
          { referenceCode: { contains: search } },
          { title: { contains: search } },
          {
            intern: {
              is: {
                OR: [
                  { registrationCode: { contains: search } },
                  { firstName: { contains: search } },
                  { lastName: { contains: search } },
                ],
              },
            },
          },
          {
            projectAssignments: {
              some: {
                status: { not: AssignmentStatus.REMOVED },
                project: {
                  is: {
                    OR: [
                      { projectCode: { contains: search } },
                      { name: { contains: search } },
                    ],
                  },
                },
              },
            },
          },
        ],
      }),
    };

    const [
      items,
      total,
      ongoingInternships,
      plannedInternships,
      activeProjects,
      departments,
    ] = await Promise.all([
      this.prisma.internship.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ startDate: 'desc' }, { referenceCode: 'asc' }],
        include: {
          intern: true,
          department: true,
          supervisor: {
            include: {
              employee: true,
            },
          },
          projectAssignments: {
            where: {
              status: { not: AssignmentStatus.REMOVED },
            },
            include: {
              project: true,
            },
            orderBy: {
              assignedAt: 'desc',
            },
          },
        },
      }),
      this.prisma.internship.count({ where }),
      this.prisma.internship.count({
        where: { isActive: true, status: InternshipStatus.ONGOING },
      }),
      this.prisma.internship.count({
        where: { isActive: true, status: InternshipStatus.PLANNED },
      }),
      this.prisma.project.count({
        where: { isActive: true },
      }),
      this.prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      summary: { ongoingInternships, plannedInternships, activeProjects },
      items,
      filters: { departments },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const internship = await this.prisma.internship.findUnique({
      where: {
        id,
      },
      include: {
        intern: true,
        department: true,
        supervisor: {
          include: {
            employee: true,
          },
        },
        authority: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!internship) {
      throw new NotFoundException('Stage introuvable.');
    }

    return internship;
  }

  async update(id: string, updateInternshipDto: UpdateInternshipDto) {
    const currentInternship = await this.findOne(id);

    const referenceCode = updateInternshipDto.referenceCode
      ?.trim()
      .toUpperCase();
    const startDate =
      updateInternshipDto.startDate !== undefined
        ? this.parseDate(updateInternshipDto.startDate, 'La date de début')
        : currentInternship.startDate;
    const endDate =
      updateInternshipDto.endDate !== undefined
        ? this.parseDate(updateInternshipDto.endDate, 'La date de fin')
        : currentInternship.endDate;
    const internId = updateInternshipDto.internId ?? currentInternship.internId;
    const departmentId =
      updateInternshipDto.departmentId ?? currentInternship.departmentId;
    const supervisorId =
      updateInternshipDto.supervisorId ?? currentInternship.supervisorId;
    const authorityId =
      updateInternshipDto.authorityId !== undefined
        ? updateInternshipDto.authorityId
        : currentInternship.authorityId;
    const status = updateInternshipDto.status ?? currentInternship.status;

    this.validateDateRange(startDate, endDate);

    if (updateInternshipDto.isActive === false && status === 'ONGOING') {
      throw new ConflictException(
        'Un stage en cours doit être terminé ou annulé avant sa désactivation.',
      );
    }

    await this.verifyRelations(
      internId,
      departmentId,
      supervisorId,
      authorityId,
    );

    if (referenceCode !== undefined) {
      const existingInternship = await this.prisma.internship.findFirst({
        where: {
          id: {
            not: id,
          },
          referenceCode,
        },
      });

      if (existingInternship) {
        throw new ConflictException('Cette référence de stage existe déjà.');
      }
    }

    if (status !== InternshipStatus.CANCELLED) {
      await this.verifyNoOverlap(internId, startDate, endDate, id);
    }

    const description =
      updateInternshipDto.description !== undefined
        ? updateInternshipDto.description?.trim() || null
        : undefined;

    return this.prisma.internship.update({
      where: {
        id,
      },
      data: {
        ...(referenceCode !== undefined && { referenceCode }),
        ...(updateInternshipDto.title !== undefined && {
          title: updateInternshipDto.title.trim(),
        }),
        ...(description !== undefined && { description }),
        ...(updateInternshipDto.startDate !== undefined && { startDate }),
        ...(updateInternshipDto.endDate !== undefined && { endDate }),
        ...(updateInternshipDto.status !== undefined && {
          status: updateInternshipDto.status,
        }),
        ...(updateInternshipDto.internshipType !== undefined && {
          internshipType: updateInternshipDto.internshipType,
        }),
        ...(updateInternshipDto.monthlyAllowance !== undefined && {
          monthlyAllowance: updateInternshipDto.monthlyAllowance,
        }),
        ...(updateInternshipDto.currency !== undefined && {
          currency: updateInternshipDto.currency.trim().toUpperCase(),
        }),
        ...(updateInternshipDto.workLocation !== undefined && {
          workLocation: updateInternshipDto.workLocation.trim(),
        }),
        ...(updateInternshipDto.internId !== undefined && { internId }),
        ...(updateInternshipDto.departmentId !== undefined && {
          departmentId,
        }),
        ...(updateInternshipDto.supervisorId !== undefined && {
          supervisorId,
        }),
        ...(updateInternshipDto.authorityId !== undefined && {
          authorityId,
        }),
        ...(updateInternshipDto.grade !== undefined && {
          grade: updateInternshipDto.grade,
        }),
        ...(updateInternshipDto.isActive !== undefined && {
          isActive: updateInternshipDto.isActive,
        }),
      },
      include: {
        intern: true,
        department: true,
        supervisor: {
          include: {
            employee: true,
          },
        },
        authority: {
          include: {
            employee: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const internship = await this.findOne(id);

    if (!internship.isActive) {
      throw new ConflictException('Ce stage est déjà désactivé.');
    }

    if (internship.status === InternshipStatus.ONGOING) {
      throw new ConflictException(
        'Un stage en cours doit être terminé ou annulé avant sa désactivation.',
      );
    }

    const activeAssignments = await this.prisma.projectAssignment.count({
      where: {
        internshipId: id,
        status: {
          in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
        },
      },
    });

    if (activeAssignments > 0) {
      throw new ConflictException(
        'Ce stage possède encore des affectations de projet actives.',
      );
    }

    return this.prisma.internship.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }
}

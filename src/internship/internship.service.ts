import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InternshipStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInternshipDto } from './dto/create-internship.dto';
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

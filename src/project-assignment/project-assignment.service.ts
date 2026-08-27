import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AssignmentStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';
import { UpdateProjectAssignmentDto } from './dto/update-project-assignment.dto';

@Injectable()
export class ProjectAssignmentService {
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

  private async getActiveInternship(internshipId: string) {
    const internship = await this.prisma.internship.findFirst({
      where: {
        id: internshipId,
        isActive: true,
        status: {
          in: ['PLANNED', 'ONGOING'],
        },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!internship) {
      throw new NotFoundException(
        'Le stage indiqué est introuvable, inactif, terminé ou annulé.',
      );
    }

    return internship;
  }

  private async getActiveProject(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        isActive: true,
        status: {
          in: ['PLANNED', 'ONGOING'],
        },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Le projet indiqué est introuvable, inactif, terminé ou annulé.',
      );
    }

    return project;
  }

  private validateAssignmentPeriod(
    startDate: Date,
    endDate: Date,
    internship: { startDate: Date; endDate: Date },
    project: { startDate: Date; endDate: Date },
  ): void {
    this.validateDateRange(startDate, endDate);

    if (
      startDate.getTime() < internship.startDate.getTime() ||
      endDate.getTime() > internship.endDate.getTime()
    ) {
      throw new BadRequestException(
        'La période d’affectation doit être comprise dans la période du stage.',
      );
    }

    if (
      startDate.getTime() < project.startDate.getTime() ||
      endDate.getTime() > project.endDate.getTime()
    ) {
      throw new BadRequestException(
        'La période d’affectation doit être comprise dans la période du projet.',
      );
    }
  }

  async create(createDto: CreateProjectAssignmentDto) {
    const startDate = this.parseDate(createDto.startDate, 'La date de début');
    const endDate = this.parseDate(createDto.endDate, 'La date de fin');
    const internship = await this.getActiveInternship(createDto.internshipId);
    const project = await this.getActiveProject(createDto.projectId);

    this.validateAssignmentPeriod(startDate, endDate, internship, project);

    const existingAssignment = await this.prisma.projectAssignment.findUnique({
      where: {
        internshipId_projectId: {
          internshipId: createDto.internshipId,
          projectId: createDto.projectId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Ce stage est déjà affecté à ce projet.');
    }

    return this.prisma.projectAssignment.create({
      data: {
        internshipId: createDto.internshipId,
        projectId: createDto.projectId,
        role: createDto.role.trim(),
        startDate,
        endDate,
        status: createDto.status ?? AssignmentStatus.ASSIGNED,
        notes: createDto.notes?.trim() || null,
      },
      include: {
        internship: {
          include: {
            intern: true,
          },
        },
        project: true,
      },
    });
  }

  async findAll() {
    return this.prisma.projectAssignment.findMany({
      where: {
        status: {
          not: AssignmentStatus.REMOVED,
        },
      },
      include: {
        internship: {
          include: {
            intern: true,
          },
        },
        project: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.projectAssignment.findUnique({
      where: {
        id,
      },
      include: {
        internship: {
          include: {
            intern: true,
          },
        },
        project: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Affectation de projet introuvable.');
    }

    return assignment;
  }

  async update(id: string, updateDto: UpdateProjectAssignmentDto) {
    const currentAssignment = await this.findOne(id);
    const internshipId =
      updateDto.internshipId ?? currentAssignment.internshipId;
    const projectId = updateDto.projectId ?? currentAssignment.projectId;
    const startDate =
      updateDto.startDate !== undefined
        ? this.parseDate(updateDto.startDate, 'La date de début')
        : currentAssignment.startDate;
    const endDate =
      updateDto.endDate !== undefined
        ? this.parseDate(updateDto.endDate, 'La date de fin')
        : currentAssignment.endDate;
    const internship = await this.getActiveInternship(internshipId);
    const project = await this.getActiveProject(projectId);

    this.validateAssignmentPeriod(startDate, endDate, internship, project);

    if (
      updateDto.internshipId !== undefined ||
      updateDto.projectId !== undefined
    ) {
      const existingAssignment = await this.prisma.projectAssignment.findFirst({
        where: {
          id: {
            not: id,
          },
          internshipId,
          projectId,
        },
      });

      if (existingAssignment) {
        throw new ConflictException('Ce stage est déjà affecté à ce projet.');
      }
    }

    const notes =
      updateDto.notes !== undefined
        ? updateDto.notes?.trim() || null
        : undefined;

    return this.prisma.projectAssignment.update({
      where: {
        id,
      },
      data: {
        ...(updateDto.internshipId !== undefined && { internshipId }),
        ...(updateDto.projectId !== undefined && { projectId }),
        ...(updateDto.role !== undefined && {
          role: updateDto.role.trim(),
        }),
        ...(updateDto.startDate !== undefined && { startDate }),
        ...(updateDto.endDate !== undefined && { endDate }),
        ...(updateDto.status !== undefined && {
          status: updateDto.status,
        }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        internship: {
          include: {
            intern: true,
          },
        },
        project: true,
      },
    });
  }

  async remove(id: string) {
    const assignment = await this.findOne(id);

    if (assignment.status === AssignmentStatus.REMOVED) {
      throw new ConflictException('Cette affectation est déjà retirée.');
    }

    return this.prisma.projectAssignment.update({
      where: {
        id,
      },
      data: {
        status: AssignmentStatus.REMOVED,
      },
    });
  }
}

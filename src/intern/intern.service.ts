import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';

@Injectable()
export class InternService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateOfBirth(value: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La date de naissance est invalide.');
    }

    if (date.getTime() > Date.now()) {
      throw new BadRequestException(
        'La date de naissance ne peut pas être dans le futur.',
      );
    }

    return date;
  }

  async create(createInternDto: CreateInternDto) {
    const registrationCode = createInternDto.registrationCode
      .trim()
      .toUpperCase();
    const email = createInternDto.email.trim().toLowerCase();

    const existingIntern = await this.prisma.intern.findFirst({
      where: {
        OR: [{ registrationCode }, { email }],
      },
    });

    if (existingIntern) {
      throw new ConflictException(
        'Un stagiaire avec ce matricule ou cet email existe déjà.',
      );
    }

    return this.prisma.intern.create({
      data: {
        registrationCode,
        firstName: createInternDto.firstName.trim(),
        lastName: createInternDto.lastName.trim(),
        dateOfBirth: this.parseDateOfBirth(createInternDto.dateOfBirth),
        gender: createInternDto.gender,
        email,
        phone: createInternDto.phone.trim(),
        address: createInternDto.address?.trim() || null,
        school: createInternDto.school.trim(),
        fieldOfStudy: createInternDto.fieldOfStudy.trim(),
        educationLevel: createInternDto.educationLevel,
        studyYear: createInternDto.studyYear,
        emergencyContactName:
          createInternDto.emergencyContactName?.trim() || null,
        emergencyContactPhone:
          createInternDto.emergencyContactPhone?.trim() || null,
        isActive: createInternDto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.intern.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const intern = await this.prisma.intern.findUnique({
      where: { id },
    });

    if (!intern) {
      throw new NotFoundException('Stagiaire introuvable.');
    }

    return intern;
  }

  async update(id: string, updateInternDto: UpdateInternDto) {
    await this.findOne(id);

    const registrationCode = updateInternDto.registrationCode
      ?.trim()
      .toUpperCase();
    const email = updateInternDto.email?.trim().toLowerCase();

    if (registrationCode !== undefined || email !== undefined) {
      const existingIntern = await this.prisma.intern.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(registrationCode !== undefined ? [{ registrationCode }] : []),
            ...(email !== undefined ? [{ email }] : []),
          ],
        },
      });

      if (existingIntern) {
        throw new ConflictException(
          'Un stagiaire avec ce matricule ou cet email existe déjà.',
        );
      }
    }

    const address =
      updateInternDto.address !== undefined
        ? updateInternDto.address.trim() || null
        : undefined;
    const emergencyContactName =
      updateInternDto.emergencyContactName !== undefined
        ? updateInternDto.emergencyContactName.trim() || null
        : undefined;
    const emergencyContactPhone =
      updateInternDto.emergencyContactPhone !== undefined
        ? updateInternDto.emergencyContactPhone.trim() || null
        : undefined;

    return this.prisma.intern.update({
      where: { id },
      data: {
        ...(registrationCode !== undefined && { registrationCode }),
        ...(updateInternDto.firstName !== undefined && {
          firstName: updateInternDto.firstName.trim(),
        }),
        ...(updateInternDto.lastName !== undefined && {
          lastName: updateInternDto.lastName.trim(),
        }),
        ...(updateInternDto.dateOfBirth !== undefined && {
          dateOfBirth: this.parseDateOfBirth(updateInternDto.dateOfBirth),
        }),
        ...(updateInternDto.gender !== undefined && {
          gender: updateInternDto.gender,
        }),
        ...(email !== undefined && { email }),
        ...(updateInternDto.phone !== undefined && {
          phone: updateInternDto.phone.trim(),
        }),
        ...(address !== undefined && { address }),
        ...(updateInternDto.school !== undefined && {
          school: updateInternDto.school.trim(),
        }),
        ...(updateInternDto.fieldOfStudy !== undefined && {
          fieldOfStudy: updateInternDto.fieldOfStudy.trim(),
        }),
        ...(updateInternDto.educationLevel !== undefined && {
          educationLevel: updateInternDto.educationLevel,
        }),
        ...(updateInternDto.studyYear !== undefined && {
          studyYear: updateInternDto.studyYear,
        }),
        ...(emergencyContactName !== undefined && {
          emergencyContactName,
        }),
        ...(emergencyContactPhone !== undefined && {
          emergencyContactPhone,
        }),
        ...(updateInternDto.isActive !== undefined && {
          isActive: updateInternDto.isActive,
        }),
      },
    });
  }

  async remove(id: string) {
    const intern = await this.findOne(id);

    if (!intern.isActive) {
      throw new ConflictException('Ce stagiaire est déjà désactivé.');
    }

    const activeInternships = await this.prisma.internship.count({
      where: {
        internId: id,
        isActive: true,
        status: {
          in: ['PLANNED', 'ONGOING'],
        },
      },
    });

    if (activeInternships > 0) {
      throw new ConflictException(
        'Ce stagiaire possède encore un stage planifié ou en cours.',
      );
    }

    return this.prisma.intern.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

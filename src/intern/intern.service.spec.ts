import 'reflect-metadata';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { EducationLevel, Gender } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';
import { InternService } from './intern.service';

describe('InternService', () => {
  const internRepository = {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const internshipRepository = {
    count: jest.fn(),
  };

  const prisma = {
    intern: internRepository,
    internship: internshipRepository,
  } as unknown as PrismaService;

  let service: InternService;

  const validDto: CreateInternDto = {
    registrationCode: ' stg-001 ',
    firstName: ' Awa ',
    lastName: ' Traoré ',
    dateOfBirth: '2001-05-10',
    gender: Gender.FEMALE,
    email: ' AWA.TRAORE@EXAMPLE.COM ',
    phone: ' 70000000 ',
    address: ' Bamako ',
    school: ' Université de Bamako ',
    fieldOfStudy: ' Informatique ',
    educationLevel: EducationLevel.LICENCE,
    studyYear: 3,
    emergencyContactName: ' Parent ',
    emergencyContactPhone: ' 71000000 ',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InternService(prisma);
  });

  it('crée un stagiaire après normalisation des données', async () => {
    internRepository.findFirst.mockResolvedValue(null);
    internRepository.create.mockResolvedValue({ id: 'intern-id' });

    await expect(service.create(validDto)).resolves.toEqual({
      id: 'intern-id',
    });

    expect(internRepository.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { registrationCode: 'STG-001' },
          { email: 'awa.traore@example.com' },
        ],
      },
    });

    expect(internRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        registrationCode: 'STG-001',
        firstName: 'Awa',
        lastName: 'Traoré',
        dateOfBirth: expect.any(Date),
        email: 'awa.traore@example.com',
        phone: '70000000',
        address: 'Bamako',
        school: 'Université de Bamako',
        fieldOfStudy: 'Informatique',
        emergencyContactName: 'Parent',
        emergencyContactPhone: '71000000',
        isActive: true,
      }),
    });
  });

  it('refuse un matricule ou un email déjà utilisé', async () => {
    internRepository.findFirst.mockResolvedValue({ id: 'existing-id' });

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(internRepository.create).not.toHaveBeenCalled();
  });

  it('refuse une date de naissance située dans le futur', async () => {
    internRepository.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        ...validDto,
        registrationCode: 'STG-002',
        email: 'future@example.com',
        dateOfBirth: '2999-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(internRepository.create).not.toHaveBeenCalled();
  });

  it('retourne seulement les stagiaires actifs dans le bon ordre', async () => {
    internRepository.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(internRepository.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  });

  it('signale un stagiaire introuvable', async () => {
    internRepository.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('normalise les données fournies lors de la modification', async () => {
    internRepository.findUnique.mockResolvedValue({
      id: 'intern-id',
      isActive: true,
    });
    internRepository.findFirst.mockResolvedValue(null);
    internRepository.update.mockResolvedValue({ id: 'intern-id' });

    const updateDto: UpdateInternDto = {
      email: ' NOUVEL.EMAIL@EXAMPLE.COM ',
      address: ' ',
    };

    await service.update('intern-id', updateDto);

    expect(internRepository.findFirst).toHaveBeenCalledWith({
      where: {
        id: { not: 'intern-id' },
        OR: [{ email: 'nouvel.email@example.com' }],
      },
    });
    expect(internRepository.update).toHaveBeenCalledWith({
      where: { id: 'intern-id' },
      data: {
        email: 'nouvel.email@example.com',
        address: null,
      },
    });
  });

  it('refuse de désactiver un stagiaire qui possède un stage actif', async () => {
    internRepository.findUnique.mockResolvedValue({
      id: 'intern-id',
      isActive: true,
    });
    internshipRepository.count.mockResolvedValue(1);

    await expect(service.remove('intern-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(internRepository.update).not.toHaveBeenCalled();
  });

  it('désactive le stagiaire sans supprimer sa ligne', async () => {
    internRepository.findUnique.mockResolvedValue({
      id: 'intern-id',
      isActive: true,
    });
    internshipRepository.count.mockResolvedValue(0);
    internRepository.update.mockResolvedValue({
      id: 'intern-id',
      isActive: false,
    });

    await expect(service.remove('intern-id')).resolves.toEqual({
      id: 'intern-id',
      isActive: false,
    });
    expect(internRepository.update).toHaveBeenCalledWith({
      where: { id: 'intern-id' },
      data: { isActive: false },
    });
  });

  it('refuse de désactiver deux fois le même stagiaire', async () => {
    internRepository.findUnique.mockResolvedValue({
      id: 'intern-id',
      isActive: false,
    });

    await expect(service.remove('intern-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(internRepository.update).not.toHaveBeenCalled();
  });
});

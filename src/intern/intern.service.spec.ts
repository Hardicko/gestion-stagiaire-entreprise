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
  const internRegistrationCodeSequenceRepository = {
    upsert: jest.fn(),
  };
  const transaction = {
    intern: internRepository,
    internRegistrationCodeSequence: internRegistrationCodeSequenceRepository,
  };
  const prismaClient = {
    intern: internRepository,
    internship: internshipRepository,
    $transaction: jest.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };

  const prisma = prismaClient as unknown as PrismaService;

  let service: InternService;

  const validDto: CreateInternDto = {
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-26T12:00:00.000Z'));
    service = new InternService(prisma);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('crée un stagiaire après normalisation des données', async () => {
    internRepository.findFirst.mockResolvedValue(null);
    internRepository.findUnique.mockResolvedValue(null);
    internRegistrationCodeSequenceRepository.upsert.mockResolvedValue({
      year: 2026,
      lastValue: 1,
    });
    internRepository.create.mockResolvedValue({
      id: 'intern-id',
      registrationCode: 'STG-2026-0001',
    });

    await expect(service.create(validDto)).resolves.toEqual({
      id: 'intern-id',
      registrationCode: 'STG-2026-0001',
    });

    expect(internRepository.findFirst).toHaveBeenCalledWith({
      where: { email: 'awa.traore@example.com' },
      select: { id: true },
    });
    expect(
      internRegistrationCodeSequenceRepository.upsert,
    ).toHaveBeenCalledWith({
      where: { year: 2026 },
      create: {
        year: 2026,
        lastValue: 1,
      },
      update: {
        lastValue: {
          increment: 1,
        },
      },
    });
    expect(internRepository.findUnique).toHaveBeenCalledWith({
      where: { registrationCode: 'STG-2026-0001' },
      select: { id: true },
    });

    expect(internRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        registrationCode: 'STG-2026-0001',
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

  it('refuse un email déjà utilisé', async () => {
    internRepository.findFirst.mockResolvedValue({ id: 'existing-id' });

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      internRegistrationCodeSequenceRepository.upsert,
    ).not.toHaveBeenCalled();
    expect(internRepository.create).not.toHaveBeenCalled();
  });

  it('saute un code d’inscription existant et utilise le suivant', async () => {
    internRepository.findFirst.mockResolvedValue(null);
    internRegistrationCodeSequenceRepository.upsert
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 1,
      })
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 2,
      });
    internRepository.findUnique
      .mockResolvedValueOnce({ id: 'existing-intern' })
      .mockResolvedValueOnce(null);
    internRepository.create.mockResolvedValue({ id: 'intern-id' });

    await service.create(validDto);

    expect(internRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          registrationCode: 'STG-2026-0002',
        }),
      }),
    );
  });

  it('réessaie après une collision simultanée du code d’inscription', async () => {
    internRepository.findFirst.mockResolvedValue(null);
    internRegistrationCodeSequenceRepository.upsert
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 1,
      })
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 1,
      })
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 2,
      });
    internRepository.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'concurrent-intern' })
      .mockResolvedValueOnce(null);
    internRepository.create
      .mockRejectedValueOnce(
        Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
        }),
      )
      .mockResolvedValueOnce({
        id: 'intern-id',
        registrationCode: 'STG-2026-0002',
      });

    await expect(service.create(validDto)).resolves.toEqual({
      id: 'intern-id',
      registrationCode: 'STG-2026-0002',
    });
    expect(prismaClient.$transaction).toHaveBeenCalledTimes(2);
  });

  it('convertit une collision simultanée sur l’email en conflit métier', async () => {
    internRepository.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'concurrent-intern' });
    internRepository.findUnique.mockResolvedValue(null);
    internRegistrationCodeSequenceRepository.upsert.mockResolvedValue({
      year: 2026,
      lastValue: 1,
    });
    internRepository.create.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      }),
    );

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prismaClient.$transaction).toHaveBeenCalledTimes(2);
  });

  it('refuse une date de naissance située dans le futur', async () => {
    await expect(
      service.create({
        ...validDto,
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
        email: 'nouvel.email@example.com',
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

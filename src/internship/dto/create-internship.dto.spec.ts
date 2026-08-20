import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { InternshipStatus, InternshipType } from '../../generated/prisma/enums';
import { CreateInternshipDto } from './create-internship.dto';

describe('CreateInternshipDto', () => {
  const validPayload = {
    referenceCode: 'STAGE-001',
    title: 'Stage en développement web',
    startDate: '2026-09-01',
    endDate: '2026-12-01',
    status: InternshipStatus.PLANNED,
    internshipType: InternshipType.ACADEMIC,
    monthlyAllowance: 75000,
    currency: 'XOF',
    workLocation: 'Bamako',
    internId: '11111111-1111-4111-8111-111111111111',
    departmentId: '22222222-2222-4222-8222-222222222222',
    supervisorId: '33333333-3333-4333-8333-333333333333',
    authorityId: '44444444-4444-4444-8444-444444444444',
    grade: 20,
  };

  it('accepte un stage valide avec une note de 0 à 20', async () => {
    const dto = plainToInstance(CreateInternshipDto, validPayload);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse une note supérieure à 20', async () => {
    const dto = plainToInstance(CreateInternshipDto, {
      ...validPayload,
      grade: 21,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'grade')).toBe(true);
  });

  it('refuse un statut, un type et une devise invalides', async () => {
    const dto = plainToInstance(CreateInternshipDto, {
      ...validPayload,
      status: 'UNKNOWN',
      internshipType: 'UNKNOWN',
      currency: 'FRANC',
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['status', 'internshipType', 'currency']),
    );
  });

  it('refuse les identifiants de relations invalides', async () => {
    const dto = plainToInstance(CreateInternshipDto, {
      ...validPayload,
      internId: 'intern-1',
      departmentId: 'department-1',
      supervisorId: 'supervisor-1',
      authorityId: 'authority-1',
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining([
        'internId',
        'departmentId',
        'supervisorId',
        'authorityId',
      ]),
    );
  });
});

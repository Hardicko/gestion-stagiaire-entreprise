import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AssignmentStatus } from '../../generated/prisma/enums';
import { CreateProjectAssignmentDto } from './create-project-assignment.dto';

describe('CreateProjectAssignmentDto', () => {
  const validPayload = {
    internshipId: '11111111-1111-4111-8111-111111111111',
    projectId: '22222222-2222-4222-8222-222222222222',
    role: 'Développeur backend',
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    status: AssignmentStatus.ASSIGNED,
    notes: 'Première affectation',
  };

  it('accepte une affectation valide', async () => {
    const dto = plainToInstance(CreateProjectAssignmentDto, validPayload);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse les identifiants et le statut invalides', async () => {
    const dto = plainToInstance(CreateProjectAssignmentDto, {
      ...validPayload,
      internshipId: 'internship-1',
      projectId: 'project-1',
      status: 'UNKNOWN',
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['internshipId', 'projectId', 'status']),
    );
  });

  it('refuse les dates invalides', async () => {
    const dto = plainToInstance(CreateProjectAssignmentDto, {
      ...validPayload,
      startDate: 'date-invalide',
      endDate: 'date-invalide',
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['startDate', 'endDate']),
    );
  });
});

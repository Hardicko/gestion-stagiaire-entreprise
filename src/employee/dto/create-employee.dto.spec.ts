import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateEmployeeDto } from './create-employee.dto';

describe('CreateEmployeeDto', () => {
  const validEmployee = {
    employeeNumber: 'EMP-2026-0001',
    firstName: 'Aminata',
    lastName: 'Diallo',
    email: 'aminata.diallo@example.com',
    departmentId: '11111111-1111-4111-8111-111111111111',
    isActive: true,
  };

  it('accepte un poste créé par UUID() dans MySQL', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      ...validEmployee,
      positionId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepte un poste créé par Prisma avec un UUID version 4', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      ...validEmployee,
      positionId: '22222222-2222-4222-8222-222222222222',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse un identifiant de poste qui n’est pas un UUID', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      ...validEmployee,
      positionId: 'poste-invalide',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('positionId');
  });
});

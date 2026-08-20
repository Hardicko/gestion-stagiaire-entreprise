import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateSupervisorDto } from './create-supervisor.dto';

describe('CreateSupervisorDto', () => {
  it('accepte un identifiant employé UUID valide', async () => {
    const dto = plainToInstance(CreateSupervisorDto, {
      employeeId: '11111111-1111-4111-8111-111111111111',
      isActive: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse un identifiant employé invalide', async () => {
    const dto = plainToInstance(CreateSupervisorDto, {
      employeeId: 'employee-1',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'employeeId')).toBe(true);
  });
});

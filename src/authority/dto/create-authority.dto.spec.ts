import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateAuthorityDto } from './create-authority.dto';

describe('CreateAuthorityDto', () => {
  const validPayload = {
    employeeId: '11111111-1111-4111-8111-111111111111',
    departmentId: '22222222-2222-4222-8222-222222222222',
    name: 'Direction des ressources humaines',
    email: 'drh@example.com',
    signingTitle: 'Directeur des ressources humaines',
  };

  it('accepte une autorité signataire valide', async () => {
    const dto = plainToInstance(CreateAuthorityDto, validPayload);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepte une autorité sans département', async () => {
    const dto = plainToInstance(CreateAuthorityDto, {
      ...validPayload,
      departmentId: null,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse les identifiants et emails invalides', async () => {
    const dto = plainToInstance(CreateAuthorityDto, {
      ...validPayload,
      employeeId: 'employee-1',
      departmentId: 'department-1',
      email: 'email-invalide',
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining(['employeeId', 'departmentId', 'email']),
    );
  });
});

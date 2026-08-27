import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SetRolePermissionsDto } from './set-role-permissions.dto';

describe('SetRolePermissionsDto', () => {
  it('accepte ensemble les UUID MySQL version 1 et Prisma version 4', async () => {
    const dto = plainToInstance(SetRolePermissionsDto, {
      permissionIds: [
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '22222222-2222-4222-8222-222222222222',
      ],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse un identifiant de permission invalide', async () => {
    const dto = plainToInstance(SetRolePermissionsDto, {
      permissionIds: ['permission-invalide'],
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('permissionIds');
  });
});

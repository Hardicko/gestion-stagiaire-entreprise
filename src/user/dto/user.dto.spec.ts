import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateUserDto } from './create-user.dto';
import { ResetUserPasswordDto } from './reset-user-password.dto';
import { UpdateUserDto } from './update-user.dto';

describe('User DTOs', () => {
  const employeeId = '11111111-1111-4111-8111-111111111111';
  // UUID version 1, identique au format produit par UUID() dans MySQL.
  const roleId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const password = 'MotDePasseSolide2026!';

  it('accepte la création d’un utilisateur valide', async () => {
    const dto = plainToInstance(CreateUserDto, {
      employeeId,
      roleId,
      password,
      confirmPassword: password,
      mustChangePassword: true,
      isActive: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('refuse les UUID invalides, un mot de passe trop court et les faux booléens', async () => {
    const dto = plainToInstance(CreateUserDto, {
      employeeId: 'employee-1',
      roleId: 'role-1',
      password: 'court',
      confirmPassword: 'court',
      mustChangePassword: 'oui',
      isActive: 'oui',
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining([
        'employeeId',
        'roleId',
        'password',
        'confirmPassword',
        'mustChangePassword',
        'isActive',
      ]),
    );
  });

  it('accepte uniquement le rôle et l’état dans une modification', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      roleId,
      isActive: false,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    const invalidDto = plainToInstance(UpdateUserDto, {
      roleId: 'role-1',
      isActive: 'non',
    });
    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['roleId', 'isActive']),
    );
  });

  it('valide les contraintes de réinitialisation du mot de passe', async () => {
    const validDto = plainToInstance(ResetUserPasswordDto, {
      newPassword: password,
      confirmNewPassword: password,
      mustChangePassword: true,
    });

    await expect(validate(validDto)).resolves.toHaveLength(0);

    const invalidDto = plainToInstance(ResetUserPasswordDto, {
      newPassword: 'court',
      confirmNewPassword: 'court',
      mustChangePassword: 'oui',
    });
    const errors = await validate(invalidDto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'newPassword',
        'confirmNewPassword',
        'mustChangePassword',
      ]),
    );
  });
});

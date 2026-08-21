import 'reflect-metadata';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn(),
  verify: jest.fn(),
}));

import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userRepository = {
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const signAsync = jest.fn();
  const get = jest.fn();
  const prisma = {
    user: userRepository,
  } as unknown as PrismaService;
  const jwtService = { signAsync } as unknown as JwtService;
  const configService = { get } as unknown as ConfigService;
  const passwordChangedAt = new Date('2026-08-21T09:30:15.123Z');

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwtService, configService);
  });

  it('lie le JWT à la version exacte du mot de passe enregistrée', async () => {
    userRepository.findFirst.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      employeeId: '11111111-1111-4111-8111-111111111111',
      roleId: '33333333-3333-4333-8333-333333333333',
      passwordHash: 'argon2-hash',
      mustChangePassword: false,
      passwordChangedAt,
      employee: {
        id: '11111111-1111-4111-8111-111111111111',
        employeeNumber: 'EMP-001',
        firstName: 'Awa',
        lastName: 'Traoré',
        email: 'awa@entreprise.ml',
        jobTitle: 'Développeuse',
        department: {
          id: '44444444-4444-4444-8444-444444444444',
          name: 'Informatique',
          code: 'IT',
        },
      },
      role: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'UTILISATEUR',
      },
    });
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    get.mockReturnValue('900');
    signAsync.mockResolvedValue('jwt-signe');
    userRepository.update.mockResolvedValue({});

    const result = await service.login({
      email: 'awa@entreprise.ml',
      password: 'MotDePasseInitial@2026!',
    });

    expect(signAsync).toHaveBeenCalledWith({
      sub: '22222222-2222-4222-8222-222222222222',
      employeeId: '11111111-1111-4111-8111-111111111111',
      email: 'awa@entreprise.ml',
      role: 'UTILISATEUR',
      passwordChangedAt: passwordChangedAt.getTime(),
    });
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'jwt-signe',
        user: expect.objectContaining({
          mustChangePassword: false,
        }),
      }),
    );
  });
});

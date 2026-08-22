import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard avec un contenu JWT mal formé', () => {
  it('refuse un jeton signé sans identifiant utilisateur avant Prisma', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ role: 'ADMINISTRATEUR' }),
    } as unknown as JwtService;
    const prisma = {
      authSession: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(jwtService, prisma, reflector);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer jeton-sans-sub' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.authSession.findUnique).not.toHaveBeenCalled();
  });
});

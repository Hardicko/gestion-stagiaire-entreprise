import 'reflect-metadata';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

describe('AuthController', () => {
  const login = jest.fn();
  const refresh = jest.fn();
  const logout = jest.fn();
  const get = jest.fn();
  const authService = {
    login,
    refresh,
    logout,
  } as unknown as AuthService;
  const configService = {
    get,
  } as unknown as ConfigService;
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
  const request = {
    ip: '10.172.1.25',
    headers: {},
    get: jest.fn().mockReturnValue('Navigateur de test'),
  } as unknown as Request;
  const issuedTokens = {
    accessToken: 'jwt-acces',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshToken: 'r'.repeat(64),
    refreshExpiresIn: 604800,
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockImplementation((name: string) => {
      if (name === 'AUTH_COOKIE_SAME_SITE') {
        return 'lax';
      }

      if (name === 'AUTH_COOKIE_SECURE') {
        return 'false';
      }

      return undefined;
    });
    controller = new AuthController(authService, configService);
  });

  it('place le refresh token dans un cookie HttpOnly et ne le retourne pas dans le JSON', async () => {
    login.mockResolvedValue({
      ...issuedTokens,
      user: {
        id: 'user-1',
      },
    });

    const result = await controller.login(
      {
        email: 'admin@entreprise.ml',
        password: 'MotDePasse@2026!',
      },
      request,
      response,
    );

    expect(login).toHaveBeenCalledWith(expect.any(Object), {
      ipAddress: '10.172.1.25',
      userAgent: 'Navigateur de test',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'gestion_stagiaire_refresh',
      issuedTokens.refreshToken,
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/auth',
        maxAge: 604800000,
      },
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'jwt-acces',
        user: {
          id: 'user-1',
        },
      }),
    );
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('lit le refresh token depuis le cookie et le fait tourner', async () => {
    const cookieRequest = {
      ...request,
      headers: {
        cookie: `autre=valeur; gestion_stagiaire_refresh=${'a'.repeat(64)}`,
      },
    } as unknown as Request;
    refresh.mockResolvedValue({
      ...issuedTokens,
      accessToken: 'jwt-renouvele',
      refreshToken: 'b'.repeat(64),
    });

    const result = await controller.refresh({}, cookieRequest, response);

    expect(refresh).toHaveBeenCalledWith(
      'a'.repeat(64),
      expect.objectContaining({
        ipAddress: '10.172.1.25',
      }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'gestion_stagiaire_refresh',
      'b'.repeat(64),
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'jwt-renouvele',
      }),
    );
  });

  it('révoque la session et supprime le cookie au logout', async () => {
    logout.mockResolvedValue({
      message: 'Déconnexion effectuée avec succès.',
    });

    await expect(
      controller.logout(
        {
          refreshToken: 'c'.repeat(64),
        },
        request,
        response,
      ),
    ).resolves.toEqual({
      message: 'Déconnexion effectuée avec succès.',
    });

    expect(logout).toHaveBeenCalledWith('c'.repeat(64));
    expect(response.clearCookie).toHaveBeenCalledWith(
      'gestion_stagiaire_refresh',
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/auth',
      },
    );
  });

  it('n’expose le refresh token dans le JSON que si le mode de compatibilité est activé', async () => {
    get.mockImplementation((name: string) =>
      name === 'AUTH_EXPOSE_REFRESH_TOKEN' ? 'true' : undefined,
    );
    login.mockResolvedValue(issuedTokens);

    const result = await controller.login(
      {
        email: 'admin@entreprise.ml',
        password: 'MotDePasse@2026!',
      },
      request,
      response,
    );

    expect(result).toEqual(
      expect.objectContaining({
        refreshToken: issuedTokens.refreshToken,
      }),
    );
  });

  it('force Secure lorsque SameSite=None est utilisé', async () => {
    get.mockImplementation((name: string) => {
      if (name === 'AUTH_COOKIE_SAME_SITE') {
        return 'none';
      }

      if (name === 'AUTH_COOKIE_SECURE') {
        return 'false';
      }

      return undefined;
    });
    login.mockResolvedValue(issuedTokens);

    await controller.login(
      {
        email: 'admin@entreprise.ml',
        password: 'MotDePasse@2026!',
      },
      request,
      response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'gestion_stagiaire_refresh',
      issuedTokens.refreshToken,
      expect.objectContaining({
        sameSite: 'none',
        secure: true,
      }),
    );
  });
});

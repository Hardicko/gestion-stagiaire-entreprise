import { createHash, randomBytes } from 'node:crypto';

import {
  BadRequestException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_INVALID_CODE,
} from './auth.constants';
import { ChangePasswordDto } from './dto/change-password.dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import type { SessionContext } from './interfaces/session-context.interface';

interface AccessTokenUser {
  id: string;
  employeeId: string;
  passwordChangedAt: Date | null;
  employee: {
    email: string;
  };
  role: {
    name: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, context: SessionContext = {}) {
    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        employee: {
          email: loginDto.email,
          isActive: true,
        },
        role: {
          isActive: true,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              where: {
                permission: {
                  isActive: true,
                },
              },
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const passwordIsValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const refreshExpiresIn = this.getRefreshTokenTtlSeconds();
    const refreshToken = this.generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt,
        ipAddress: this.normalizeContextValue(context.ipAddress, 45),
        userAgent: this.normalizeContextValue(context.userAgent, 500),
      },
      select: {
        id: true,
      },
    });

    const accessToken = await this.signAccessToken(user, session.id);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTokenTtlSeconds(),
      refreshToken,
      refreshExpiresIn,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        employeeNumber: user.employee.employeeNumber,
        firstName: user.employee.firstName,
        lastName: user.employee.lastName,
        email: user.employee.email,
        jobTitle: user.employee.jobTitle,
        department: user.employee.department,
        role: user.role.name,
        permissions: user.role.rolePermissions.map(
          ({ permission }) => permission.code,
        ),
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async refresh(
    refreshToken: string | undefined,
    context: SessionContext = {},
  ) {
    if (!refreshToken) {
      throw this.invalidRefreshToken();
    }

    const now = new Date();
    const currentRefreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: {
        refreshTokenHash: currentRefreshTokenHash,
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            employeeId: true,
            isActive: true,
            passwordChangedAt: true,
            employee: {
              select: {
                email: true,
                isActive: true,
              },
            },
            role: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    const passwordChangedAfterSessionCreation =
      session?.user.passwordChangedAt !== null &&
      session?.user.passwordChangedAt !== undefined &&
      session.user.passwordChangedAt.getTime() > session.createdAt.getTime();

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= now.getTime() ||
      !session.user.isActive ||
      !session.user.employee.isActive ||
      !session.user.role.isActive ||
      passwordChangedAfterSessionCreation
    ) {
      if (session?.revokedAt === null) {
        await this.prisma.authSession.updateMany({
          where: {
            id: session.id,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });
      }

      throw this.invalidRefreshToken();
    }

    const rotatedRefreshToken = this.generateRefreshToken();
    const rotatedRefreshTokenHash = this.hashRefreshToken(rotatedRefreshToken);
    const accessToken = await this.signAccessToken(session.user, session.id);

    const rotation = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: currentRefreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        refreshTokenHash: rotatedRefreshTokenHash,
        lastUsedAt: now,
        ipAddress: this.normalizeContextValue(context.ipAddress, 45),
        userAgent: this.normalizeContextValue(context.userAgent, 500),
      },
    });

    if (rotation.count !== 1) {
      throw this.invalidRefreshToken();
    }

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessTokenTtlSeconds(),
      refreshToken: rotatedRefreshToken,
      refreshExpiresIn: Math.max(
        0,
        Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000),
      ),
    };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw this.invalidRefreshToken();
    }

    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Déconnexion effectuée avec succès.',
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        employee: {
          isActive: true,
        },
        role: {
          isActive: true,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            jobTitle: true,
            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              where: {
                permission: {
                  isActive: true,
                },
              },
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable ou désactivé.');
    }

    return {
      id: user.id,
      employeeId: user.employeeId,
      employeeNumber: user.employee.employeeNumber,
      firstName: user.employee.firstName,
      lastName: user.employee.lastName,
      email: user.employee.email,
      phone: user.employee.phone,
      jobTitle: user.employee.jobTitle,
      department: user.employee.department,
      role: user.role.name,
      permissions: user.role.rolePermissions.map(
        ({ permission }) => permission.code,
      ),
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmNewPassword } =
      changePasswordDto;

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException(
        'La confirmation du nouveau mot de passe ne correspond pas.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        employee: {
          isActive: true,
        },
        role: {
          isActive: true,
        },
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable ou désactivé.');
    }

    const currentPasswordIsValid = await argon2.verify(
      user.passwordHash,
      currentPassword,
    );

    if (!currentPasswordIsValid) {
      throw new UnauthorizedException('Le mot de passe actuel est incorrect.');
    }

    const newPasswordIsSameAsCurrent = await argon2.verify(
      user.passwordHash,
      newPassword,
    );

    if (newPasswordIsSameAsCurrent) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent de l’ancien.',
      );
    }

    const newPasswordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    const passwordChangedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          passwordChangedAt,
          refreshTokenHash: null,
        },
      }),
      this.prisma.authSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: passwordChangedAt,
        },
      }),
    ]);

    return {
      message: 'Mot de passe modifié avec succès.',
      mustChangePassword: false,
      requiresLogin: true,
    };
  }

  private signAccessToken(user: AccessTokenUser, sessionId: string) {
    return this.jwtService.signAsync({
      sub: user.id,
      sessionId,
      employeeId: user.employeeId,
      email: user.employee.email,
      role: user.role.name,
      passwordChangedAt: user.passwordChangedAt?.getTime() ?? null,
    });
  }

  private generateRefreshToken() {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken, 'utf8').digest('hex');
  }

  private getAccessTokenTtlSeconds() {
    return this.getPositiveSeconds(
      'JWT_EXPIRES_IN_SECOND',
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    );
  }

  private getRefreshTokenTtlSeconds() {
    return this.getPositiveSeconds(
      'JWT_REFRESH_EXPIRES_IN_SECOND',
      DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
    );
  }

  private getPositiveSeconds(name: string, fallback: number) {
    const configured = Number(this.configService.get<string>(name));

    return Number.isSafeInteger(configured) && configured > 0
      ? configured
      : fallback;
  }

  private normalizeContextValue(
    value: string | undefined,
    maxLength: number,
  ): string | undefined {
    const normalized = value?.trim();

    return normalized ? normalized.slice(0, maxLength) : undefined;
  }

  private invalidRefreshToken() {
    return new UnauthorizedException({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: REFRESH_TOKEN_INVALID_CODE,
      message: 'Refresh token invalide, expiré ou révoqué.',
    });
  }
}

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
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

    const expiresIn = Number(
      this.configService.get<string>('JWT_EXPIRES_IN_SECOND') ?? '900',
    );

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      employeeId: user.employeeId,
      email: user.employee.email,
      role: user.role.name,
      passwordChangedAt: user.passwordChangedAt?.getTime() ?? null,
    });

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
      expiresIn,
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

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        refreshTokenHash: null,
      },
    });

    return {
      message: 'Mot de passe modifié avec succès.',
      mustChangePassword: false,
      requiresLogin: true,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly safeUserSelect = {
    id: true,
    employeeId: true,
    roleId: true,
    mustChangePassword: true,
    passwordChangedAt: true,
    lastLoginAt: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    employee: {
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        isActive: true,
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
        description: true,
        isActive: true,
      },
    },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    if (createUserDto.password !== createUserDto.confirmPassword) {
      throw new BadRequestException(
        'Le mot de passe et sa confirmation ne correspondent pas.',
      );
    }

    await this.verifyEmployee(createUserDto.employeeId);
    await this.verifyRole(createUserDto.roleId);

    const existingUser = await this.prisma.user.findUnique({
      where: { employeeId: createUserDto.employeeId },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        'Un compte utilisateur existe déjà pour cet employé.',
      );
    }

    const passwordHash = await argon2.hash(createUserDto.password, {
      type: argon2.argon2id,
    });

    return this.prisma.user.create({
      data: {
        employeeId: createUserDto.employeeId,
        roleId: createUserDto.roleId,
        passwordHash,
        mustChangePassword: createUserDto.mustChangePassword ?? true,
        isActive: createUserDto.isActive ?? true,
      },
      select: this.safeUserSelect,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: this.safeUserSelect,
      orderBy: {
        employee: {
          lastName: 'asc',
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect,
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, actorUserId: string) {
    const currentUser = await this.findOne(id);

    if (updateUserDto.isActive === false && id === actorUserId) {
      throw new ConflictException(
        'Vous ne pouvez pas désactiver votre propre compte.',
      );
    }

    const newRole = updateUserDto.roleId
      ? await this.verifyRole(updateUserDto.roleId)
      : currentUser.role;

    const removesAdministratorAccess =
      currentUser.role.name === 'ADMINISTRATEUR' &&
      (updateUserDto.isActive === false || newRole.name !== 'ADMINISTRATEUR');

    if (removesAdministratorAccess) {
      await this.ensureAnotherAdministrator(id);
    }

    const updateUser = this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.roleId !== undefined && {
          roleId: updateUserDto.roleId,
        }),
        ...(updateUserDto.isActive !== undefined && {
          isActive: updateUserDto.isActive,
        }),
      },
      select: this.safeUserSelect,
    });

    if (updateUserDto.isActive !== false) {
      return updateUser;
    }

    const revokedAt = new Date();
    const [updatedUser] = await this.prisma.$transaction([
      updateUser,
      this.prisma.authSession.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt,
        },
      }),
    ]);

    return updatedUser;
  }

  async resetPassword(id: string, resetPasswordDto: ResetUserPasswordDto) {
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmNewPassword) {
      throw new BadRequestException(
        'Le nouveau mot de passe et sa confirmation ne correspondent pas.',
      );
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (!currentUser.isActive) {
      throw new ConflictException(
        'Réactivez le compte avant de réinitialiser son mot de passe.',
      );
    }

    const reusesCurrentPassword = await argon2.verify(
      currentUser.passwordHash,
      resetPasswordDto.newPassword,
    );

    if (reusesCurrentPassword) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien.",
      );
    }

    const passwordHash = await argon2.hash(resetPasswordDto.newPassword, {
      type: argon2.argon2id,
    });

    const passwordChangedAt = new Date();
    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: resetPasswordDto.mustChangePassword ?? true,
          passwordChangedAt,
          refreshTokenHash: null,
        },
        select: this.safeUserSelect,
      }),
      this.prisma.authSession.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: passwordChangedAt,
        },
      }),
    ]);

    return updatedUser;
  }

  async remove(id: string, actorUserId: string) {
    if (id === actorUserId) {
      throw new ConflictException(
        'Vous ne pouvez pas désactiver votre propre compte.',
      );
    }

    const currentUser = await this.findOne(id);

    if (!currentUser.isActive) {
      throw new ConflictException('Cet utilisateur est déjà désactivé.');
    }

    if (currentUser.role.name === 'ADMINISTRATEUR') {
      await this.ensureAnotherAdministrator(id);
    }

    const revokedAt = new Date();
    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          refreshTokenHash: null,
        },
        select: this.safeUserSelect,
      }),
      this.prisma.authSession.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt,
        },
      }),
    ]);

    return updatedUser;
  }

  private async verifyEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException('Employé actif introuvable.');
    }

    return employee;
  }

  private async verifyRole(roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Rôle actif introuvable.');
    }

    return role;
  }

  private async ensureAnotherAdministrator(userId: string) {
    const otherAdministratorCount = await this.prisma.user.count({
      where: {
        id: { not: userId },
        isActive: true,
        role: {
          is: {
            name: 'ADMINISTRATEUR',
            isActive: true,
          },
        },
      },
    });

    if (otherAdministratorCount === 0) {
      throw new ConflictException(
        'Impossible de désactiver ou rétrograder le dernier administrateur actif.',
      );
    }
  }
}

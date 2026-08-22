import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Permission, Role } from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

type RoleWithPermissions = Role & {
  rolePermissions: Array<{ permission: Permission }>;
};

@Injectable()
export class RoleService {
  private readonly permissionsInclude = {
    rolePermissions: {
      where: {
        permission: {
          isActive: true,
        },
      },
      include: {
        permission: true,
      },
    },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const name = createRoleDto.name.trim().toUpperCase();
    const description = createRoleDto.description?.trim();

    const existingRole = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      throw new ConflictException('Ce rôle existe déjà.');
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        ...(description !== undefined && { description }),
        isActive: createRoleDto.isActive ?? true,
      },
      include: this.permissionsInclude,
    });

    return this.formatRole(role);
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      where: {
        isActive: true,
      },
      include: this.permissionsInclude,
      orderBy: {
        name: 'asc',
      },
    });

    return roles.map((role) => this.formatRole(role));
  }

  async findOne(id: string) {
    const role = await this.findRoleEntity(id);
    return this.formatRole(role);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const currentRole = await this.findRoleEntity(id);
    const name = updateRoleDto.name?.trim().toUpperCase();
    const description = updateRoleDto.description?.trim();

    if (
      currentRole.name === 'ADMINISTRATEUR' &&
      ((name !== undefined && name !== 'ADMINISTRATEUR') ||
        updateRoleDto.isActive === false)
    ) {
      throw new ConflictException(
        'Le rôle ADMINISTRATEUR ne peut pas être renommé ou désactivé.',
      );
    }

    if (name !== undefined) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name,
          id: {
            not: id,
          },
        },
      });

      if (existingRole) {
        throw new ConflictException('Ce rôle existe déjà.');
      }
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(updateRoleDto.isActive !== undefined && {
          isActive: updateRoleDto.isActive,
        }),
      },
      include: this.permissionsInclude,
    });

    return this.formatRole(role);
  }

  async setPermissions(
    id: string,
    setRolePermissionsDto: SetRolePermissionsDto,
  ) {
    const role = await this.findRoleEntity(id);

    if (!role.isActive) {
      throw new ConflictException(
        'Réactivez le rôle avant de modifier ses permissions.',
      );
    }

    const permissionIds = [...new Set(setRolePermissionsDto.permissionIds)];
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException(
        'Une ou plusieurs permissions sont introuvables ou inactives.',
      );
    }

    if (role.name === 'ADMINISTRATEUR') {
      const activePermissionCount = await this.prisma.permission.count({
        where: {
          isActive: true,
        },
      });

      if (permissionIds.length !== activePermissionCount) {
        throw new ConflictException(
          'Le rôle ADMINISTRATEUR doit conserver toutes les permissions actives.',
        );
      }
    }

    const operations = [
      this.prisma.rolePermission.deleteMany({
        where: {
          roleId: id,
        },
      }),
    ];

    if (permissionIds.length > 0) {
      operations.push(
        this.prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
          skipDuplicates: true,
        }),
      );
    }

    await this.prisma.$transaction(operations);
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.findRoleEntity(id);

    if (!role.isActive) {
      throw new ConflictException('Ce rôle est déjà désactivé.');
    }

    if (role.name === 'ADMINISTRATEUR') {
      throw new ConflictException(
        'Le rôle ADMINISTRATEUR ne peut pas être désactivé.',
      );
    }

    const activeUserCount = await this.prisma.user.count({
      where: {
        roleId: id,
        isActive: true,
      },
    });

    if (activeUserCount > 0) {
      throw new ConflictException(
        'Ce rôle est encore attribué à un ou plusieurs utilisateurs actifs.',
      );
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: this.permissionsInclude,
    });

    return this.formatRole(updatedRole);
  }

  private async findRoleEntity(id: string): Promise<RoleWithPermissions> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: this.permissionsInclude,
    });

    if (!role) {
      throw new NotFoundException('Rôle introuvable.');
    }

    return role;
  }

  private formatRole(roleWithPermissions: RoleWithPermissions) {
    const { rolePermissions, ...role } = roleWithPermissions;

    return {
      ...role,
      permissions: rolePermissions.map(({ permission }) => permission),
    };
  }
}

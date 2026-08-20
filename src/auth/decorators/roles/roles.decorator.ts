import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type ApplicationRole = 'ADMINISTRATEUR' | 'UTILISATEUR';

export const Roles = (...roles: ApplicationRole[]) => SetMetadata(ROLES_KEY, roles);

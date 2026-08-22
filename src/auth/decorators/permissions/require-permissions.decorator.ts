import { SetMetadata } from '@nestjs/common';

import type { PermissionCode } from '../../permissions.constants';

export const PERMISSIONS_KEY = 'required_permissions';

export interface PermissionRequirement {
  mode: 'all' | 'any';
  permissions: PermissionCode[];
}

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, {
    mode: 'all',
    permissions,
  } satisfies PermissionRequirement);

export const RequireAnyPermission = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, {
    mode: 'any',
    permissions,
  } satisfies PermissionRequirement);

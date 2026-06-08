import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';
/** Restringe un endpoint a uno o más roles. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

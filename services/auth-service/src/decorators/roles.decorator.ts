import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@openmaas/types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

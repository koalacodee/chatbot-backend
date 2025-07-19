import { SetMetadata } from '@nestjs/common';
import { Roles } from '../../shared/value-objects/role.vo';

export const ROLES_KEY = 'roles';
export const UseRoles = (...roles: Roles[]) => SetMetadata(ROLES_KEY, roles);

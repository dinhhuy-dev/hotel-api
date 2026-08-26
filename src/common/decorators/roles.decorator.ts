import { SetMetadata } from '@nestjs/common';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';

export const ROLES_KEY = Symbol('roles');

export const Roles = (...roles: AccountRole[]) => SetMetadata(ROLES_KEY, roles);

import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';

export interface AuthenticatedUser {
  accountId: string;
  role?: AccountRole;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

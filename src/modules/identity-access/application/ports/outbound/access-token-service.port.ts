import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';

export interface AccessTokenServicePort {
  createAccessToken(accountId: string, role: AccountRole): Promise<string>;
}

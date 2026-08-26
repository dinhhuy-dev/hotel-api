import { AccountToken } from 'src/modules/identity-access/domain/account-token';
import { AccountTokenType } from 'src/modules/identity-access/domain/enums/account-token-type';

export interface AccountTokenRepositoryPort {
  findByTokenHashAndType(tokenHash: string, type: AccountTokenType): Promise<AccountToken | null>;

  deleteUnusedByAccountIdAndType(accountId: string, type: AccountTokenType): Promise<void>;

  save(accountToken: AccountToken): Promise<void>;
}

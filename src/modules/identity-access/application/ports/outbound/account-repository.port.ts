import { Account } from 'src/modules/identity-access/domain/account';

export interface AccountRepositoryPort {
  findById(id: string): Promise<Account | null>;

  findByEmail(email: string): Promise<Account | null>;

  findByRefreshTokenHash(refreshTokenHash: string): Promise<Account | null>;

  save(account: Account): Promise<void>;
}

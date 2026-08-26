import { AccountToken } from 'src/modules/identity-access/domain/account-token';
import { AccountTokenOrmEntity } from '../entities/account-token.orm.entity';
import { AccountOrmEntity } from '../entities/account.orm.entity';

export class AccountTokenMapper {
  static toDomain(entity: AccountTokenOrmEntity): AccountToken {
    return AccountToken.rehydrate({
      id: entity.id,
      accountId: entity.accountId,
      type: entity.type,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      usedAt: entity.usedAt,
    });
  }

  static toPersistence(accountToken: AccountToken): AccountTokenOrmEntity {
    const entity = new AccountTokenOrmEntity();

    entity.id = accountToken.id;
    entity.account = {
      id: accountToken.accountId,
    } as AccountOrmEntity;
    entity.type = accountToken.type;
    entity.tokenHash = accountToken.tokenHash;
    entity.expiresAt = accountToken.expiresAt;
    entity.createdAt = accountToken.createdAt;
    entity.usedAt = accountToken.usedAt;

    return entity;
  }
}

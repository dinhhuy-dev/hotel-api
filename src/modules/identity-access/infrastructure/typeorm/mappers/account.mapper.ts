import { Account } from 'src/modules/identity-access/domain/account';
import { AccountOrmEntity } from '../entities/account.orm.entity';

export class AccountMapper {
  static toDomain(entity: AccountOrmEntity): Account {
    return Account.rehydrate({
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      role: entity.role,
      status: entity.status,
      emailVerifiedAt: entity.emailVerifiedAt,
      refreshTokenHash: entity.refreshTokenHash,
      refreshTokenExpiresAt: entity.refreshTokenExpiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(account: Account): AccountOrmEntity {
    const entity = new AccountOrmEntity();

    entity.id = account.id;
    entity.email = account.email;
    entity.passwordHash = account.passwordHash;
    entity.role = account.role;
    entity.status = account.status;
    entity.emailVerifiedAt = account.emailVerifiedAt;
    entity.refreshTokenHash = account.refreshTokenHash;
    entity.refreshTokenExpiresAt = account.refreshTokenExpiresAt;
    entity.createdAt = account.createdAt;
    entity.updatedAt = account.updatedAt;

    return entity;
  }
}

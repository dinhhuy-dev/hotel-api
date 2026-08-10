import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountTokenRepositoryPort } from 'src/modules/identity-access/application/ports/outbound/account-token-repository.port';
import { AccountToken } from 'src/modules/identity-access/domain/account-token';
import { AccountTokenType } from 'src/modules/identity-access/domain/enums/account-token-type';
import { AccountTokenOrmEntity } from '../entities/account-token.orm.entity';
import { Repository } from 'typeorm';
import { AccountTokenMapper } from '../mappers/account-token.mapper';
import { TypeOrmTransactionContext } from '../../adapters/typeorm-transaction-context';

@Injectable()
export class TypeOrmAccountTokenRepository implements AccountTokenRepositoryPort {
  constructor(
    @InjectRepository(AccountTokenOrmEntity)
    private readonly defaultRepository: Repository<AccountTokenOrmEntity>,
    private readonly transactionContext: TypeOrmTransactionContext,
  ) {}

  private get repository(): Repository<AccountTokenOrmEntity> {
    return this.transactionContext.getRepository(
      AccountTokenOrmEntity,
      this.defaultRepository,
    );
  }

  async findByTokenHashAndType(
    tokenHash: string,
    type: AccountTokenType,
  ): Promise<AccountToken | null> {
    const entity = await this.repository.findOneBy({ tokenHash, type });

    return entity === null ? null : AccountTokenMapper.toDomain(entity);
  }

  async deleteUnusedByAccountIdAndType(
    accountId: string,
    type: AccountTokenType,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(AccountTokenOrmEntity)
      .where('account_id = :accountId', { accountId })
      .andWhere('type = :type', { type })
      .andWhere('used_at IS NULL')
      .execute();
  }
  async save(accountToken: AccountToken): Promise<void> {
    const entity = AccountTokenMapper.toPersistence(accountToken);

    await this.repository.save(entity);
  }
}

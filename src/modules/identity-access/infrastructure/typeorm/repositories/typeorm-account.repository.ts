import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountRepositoryPort } from 'src/modules/identity-access/application/ports/outbound/account-repository.port';
import { Account } from 'src/modules/identity-access/domain/account';
import { AccountOrmEntity } from '../entities/account.orm.entity';
import { Repository } from 'typeorm';
import { AccountMapper } from '../mappers/account.mapper';
import { TypeOrmTransactionContext } from '../../adapters/typeorm-transaction-context';

@Injectable()
export class TypeOrmAccountRepository implements AccountRepositoryPort {
  constructor(
    @InjectRepository(AccountOrmEntity)
    private readonly defaultRepository: Repository<AccountOrmEntity>,
    private readonly transactionContext: TypeOrmTransactionContext,
  ) {}

  private get repository(): Repository<AccountOrmEntity> {
    return this.transactionContext.getRepository(
      AccountOrmEntity,
      this.defaultRepository,
    );
  }

  async findById(id: string): Promise<Account | null> {
    const entity = await this.repository.findOneBy({ id });

    return entity === null ? null : AccountMapper.toDomain(entity);
  }

  async findByEmail(email: string): Promise<Account | null> {
    const entity = await this.repository.findOneBy({ email });

    return entity === null ? null : AccountMapper.toDomain(entity);
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<Account | null> {
    const entity = await this.repository.findOneBy({ refreshTokenHash });

    return entity === null ? null : AccountMapper.toDomain(entity);
  }

  async save(account: Account): Promise<void> {
    const entity = AccountMapper.toPersistence(account);

    await this.repository.save(entity);
  }
}

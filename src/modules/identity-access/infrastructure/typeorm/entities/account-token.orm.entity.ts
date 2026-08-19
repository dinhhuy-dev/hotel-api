import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, RelationId } from 'typeorm';
import { AccountOrmEntity } from './account.orm.entity';
import { AccountTokenType } from '../../../domain/enums/account-token-type';

@Entity({ name: 'account_tokens' })
@Index('uq_account_tokens_token_hash', ['tokenHash'], { unique: true })
export class AccountTokenOrmEntity {
  @PrimaryColumn('uuid', { name: 'id' })
  id!: string;

  @ManyToOne(() => AccountOrmEntity, {
    nullable: false,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'account_id',
    referencedColumnName: 'id',
  })
  account!: AccountOrmEntity;

  @RelationId((accounToken: AccountTokenOrmEntity) => accounToken.account)
  accountId!: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: AccountTokenType,
  })
  type!: AccountTokenType;

  @Column({
    name: 'token_hash',
    type: 'varchar',
    length: 128,
  })
  tokenHash!: string;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
  })
  expiresAt!: Date;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @Column({
    name: 'used_at',
    type: 'timestamptz',
    nullable: true,
  })
  usedAt!: Date | null;
}

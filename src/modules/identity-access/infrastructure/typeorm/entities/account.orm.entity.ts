import { AccountRole } from '../../../domain/enums/account-role';
import { AccountStatus } from '../../../domain/enums/account-status';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'accounts' })
@Index('uq_accounts_email', ['email'], { unique: true })
@Index('uq_accounts_refresh_token_hash', ['refreshTokenHash'], {
  unique: true,
  where: '"refresh_token_hash" IS NOT NULL',
})
export class AccountOrmEntity {
  @PrimaryColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'email', type: 'varchar', length: 320 })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({
    name: 'role',
    type: 'enum',
    enum: AccountRole,
    enumName: 'account_role_enum',
  })
  role!: AccountRole;

  @Column({
    name: 'status',
    type: 'enum',
    enum: AccountStatus,
    enumName: 'account_status_enum',
  })
  status!: AccountStatus;

  @Column({
    name: 'email_verified_at',
    type: 'timestamptz',
    nullable: true,
  })
  emailVerifiedAt!: Date | null;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  refreshTokenHash!: string | null;

  @Column({
    name: 'refresh_token_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  refreshTokenExpiresAt!: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;
}

import { randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Account } from '../../modules/identity-access/domain/account';
import { AccountRole } from '../../modules/identity-access/domain/enums/account-role';
import { AccountStatus } from '../../modules/identity-access/domain/enums/account-status';
import { Argon2PasswordHasher } from '../../modules/identity-access/infrastructure/adapters/argon2-password-hasher';
import { AccountOrmEntity } from '../../modules/identity-access/infrastructure/typeorm/entities/account.orm.entity';
import { AccountMapper } from '../../modules/identity-access/infrastructure/typeorm/mappers/account.mapper';

interface IdentityAccountSeed {
  email: string;
  role: AccountRole;
}

const IDENTITY_ACCOUNT_SEEDS: readonly IdentityAccountSeed[] = [
  {
    email: 'administrator@hotel.test',
    role: AccountRole.ADMINISTRATOR,
  },
  {
    email: 'hotel-manager@hotel.test',
    role: AccountRole.HOTEL_MANAGER,
  },
  {
    email: 'receptionist@hotel.test',
    role: AccountRole.RECEPTIONIST,
  },
  {
    email: 'housekeeping-staff@hotel.test',
    role: AccountRole.HOUSEKEEPING_STAFF,
  },
  {
    email: 'maintenance-staff@hotel.test',
    role: AccountRole.MAINTENANCE_STAFF,
  },
  {
    email: 'customer@hotel.test',
    role: AccountRole.CUSTOMER,
  },
];

async function seedIdentityAccounts(manager: EntityManager, password: string): Promise<number> {
  const accountRepository = manager.getRepository(AccountOrmEntity);
  const passwordHasher = new Argon2PasswordHasher();
  let createdCount = 0;

  for (const seed of IDENTITY_ACCOUNT_SEEDS) {
    const existingAccount = await accountRepository.findOneBy({ email: seed.email });

    if (existingAccount) {
      const passwordMatches = await passwordHasher.compare(password, existingAccount.passwordHash);

      if (
        existingAccount.role !== seed.role ||
        existingAccount.status !== AccountStatus.ACTIVE ||
        existingAccount.emailVerifiedAt === null ||
        !passwordMatches
      ) {
        throw new Error(`Existing account conflicts with identity seed: ${seed.email}`);
      }

      continue;
    }

    const now = new Date();
    const account = Account.createPendingVerification({
      id: randomUUID(),
      email: seed.email,
      passwordHash: await passwordHasher.hash(password),
      now,
    });

    account.changeRole(seed.role, now);
    account.activateEmail(now);

    await accountRepository.save(AccountMapper.toPersistence(account));
    createdCount += 1;
  }

  return createdCount;
}

function getSeedPassword(): string {
  const password = process.env['SEED_ACCOUNT_PASSWORD'];

  if (!password || password.trim().length < 8 || password.length > 30) {
    throw new Error('SEED_ACCOUNT_PASSWORD must contain between 8 and 30 characters.');
  }

  return password;
}

function assertDevelopmentEnvironment(): void {
  if (process.env['NODE_ENV']?.trim().toLowerCase() === 'production') {
    throw new Error('Identity Access seed cannot run in production.');
  }
}

async function runIdentityAccessSeed(): Promise<void> {
  assertDevelopmentEnvironment();
  const password = getSeedPassword();

  try {
    await AppDataSource.initialize();
    const createdCount = await AppDataSource.transaction((manager) =>
      seedIdentityAccounts(manager, password),
    );
    const existingCount = IDENTITY_ACCOUNT_SEEDS.length - createdCount;

    console.log(
      `Identity Access seed completed: ${createdCount} created, ${existingCount} already present.`,
    );
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runIdentityAccessSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown Identity Access seed error.';

  console.error(`Identity Access seed failed: ${message}`);
  process.exitCode = 1;
});

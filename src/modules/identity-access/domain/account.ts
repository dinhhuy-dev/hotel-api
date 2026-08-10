import { AccountRole } from './enums/account-role';
import { AccountStatus } from './enums/account-status';
import { AccountAlreadyVerifiedError } from './errors/account-already-verified.error';
import { AccountNotActiveError } from './errors/account-not-active.error';
import { InvalidAccountStateError } from './errors/invalid-account-state-error';

export interface AccountProps {
  id: string;
  email: string;
  passwordHash: string;
  role: AccountRole;
  status: AccountStatus;
  emailVerifiedAt: Date | null;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePendingAccountParams {
  id: string;
  email: string;
  passwordHash: string;
  now: Date;
}

export class Account {
  private constructor(private readonly props: AccountProps) {
    this.props.emailVerifiedAt = cloneDate(props.emailVerifiedAt);
    this.props.refreshTokenExpiresAt = cloneDate(props.refreshTokenExpiresAt);
    this.props.createdAt = cloneDate(props.createdAt) as Date;
    this.props.updatedAt = cloneDate(props.updatedAt) as Date;
  }

  static createPendingVerification(
    params: CreatePendingAccountParams,
  ): Account {
    const id = requireNonEmpty(params.id, 'Account ID');
    const email = normalizeEmail(params.email);
    const passwordHash = requireNonEmpty(params.passwordHash, 'Password hash');

    const now = requireValidDate(params.now, 'Creation time');

    return new Account({
      id,
      email,
      passwordHash,
      role: AccountRole.CUSTOMER,
      status: AccountStatus.PENDING_VERIFICATION,
      emailVerifiedAt: null,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: AccountProps): Account {
    return new Account({
      ...props,
      email: normalizeEmail(props.email),
      emailVerifiedAt: requireOptionalValidDate(
        props.emailVerifiedAt,
        'Email verification time',
      ),
      refreshTokenExpiresAt: requireOptionalValidDate(
        props.refreshTokenExpiresAt,
        'Refresh token expiration',
      ),
      createdAt: requireValidDate(props.createdAt, 'Creation time'),
      updatedAt: requireValidDate(props.updatedAt, 'Update time'),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): AccountRole {
    return this.props.role;
  }

  get status(): AccountStatus {
    return this.props.status;
  }

  get emailVerifiedAt(): Date | null {
    return cloneDate(this.props.emailVerifiedAt);
  }

  get refreshTokenHash(): string | null {
    return this.props.refreshTokenHash;
  }

  get refreshTokenExpiresAt(): Date | null {
    return cloneDate(this.props.refreshTokenExpiresAt);
  }

  get createdAt(): Date {
    return cloneDate(this.props.createdAt) as Date;
  }

  get updatedAt(): Date {
    return cloneDate(this.props.updatedAt) as Date;
  }

  activateEmail(verifiedAt: Date): void {
    const activationTime = requireValidDate(verifiedAt, 'Verification Time');

    if (
      this.props.status === AccountStatus.ACTIVE &&
      this.props.emailVerifiedAt !== null
    ) {
      throw new AccountAlreadyVerifiedError();
    }

    if (this.props.status !== AccountStatus.PENDING_VERIFICATION) {
      throw new InvalidAccountStateError(
        'Only pending accounts can be activated with email verification',
      );
    }

    this.props.status = AccountStatus.ACTIVE;
    this.props.emailVerifiedAt = activationTime;
    this.props.updatedAt = activationTime;
  }

  assertCanSignin() {
    if (
      this.props.status !== AccountStatus.ACTIVE ||
      this.props.emailVerifiedAt === null
    ) {
      throw new AccountNotActiveError();
    }
  }

  storeRefreshToken(
    refreshTokenHash: string,
    expiresAt: Date,
    updatedAt: Date,
  ) {
    this.assertCanSignin();

    const tokenHash = requireNonEmpty(refreshTokenHash, 'Refresh token hash');

    const expiration = requireValidDate(
      expiresAt,
      'Refresh token expiration Time',
    );

    const updateTime = requireValidDate(updatedAt, 'Update Time');

    if (expiration.getTime() <= updateTime.getTime()) {
      throw new InvalidAccountStateError(
        'Refresh token expiration time must be in the future',
      );
    }

    this.props.refreshTokenHash = tokenHash;
    this.props.refreshTokenExpiresAt = expiration;
    this.props.updatedAt = updateTime;
  }

  clearRefreshToken(updatedAt: Date): void {
    const updateTime = requireValidDate(updatedAt, 'Update time');

    this.props.refreshTokenHash = null;
    this.props.refreshTokenExpiresAt = null;
    this.props.updatedAt = updateTime;
  }

  changePassword(password: string, updatedAt: Date): void {
    const newPasswordHash = requireNonEmpty(password, 'Password hash');
    const updateTime = requireValidDate(updatedAt, 'Update Time');

    this.props.passwordHash = newPasswordHash;
    this.props.refreshTokenHash = null;
    this.props.refreshTokenExpiresAt = null;
    this.props.updatedAt = updateTime;
  }

  changeRole(role: AccountRole, updatedAt: Date): void {
    const updateTime = requireValidDate(updatedAt, 'Update Time');

    this.props.role = role;
    this.props.updatedAt = updateTime;
  }

  disable(disableAt: Date): void {
    const updateTime = requireValidDate(disableAt, 'Disable time');

    this.props.status = AccountStatus.DISABLED;
    this.props.refreshTokenHash = null;
    this.props.refreshTokenExpiresAt = null;
    this.props.updatedAt = updateTime;
  }
}

export function normalizeEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizeEmail.length === 0 || !normalizedEmail.includes('@')) {
    throw new InvalidAccountStateError('Email address is invalid');
  }

  return normalizedEmail;
}

function requireNonEmpty(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new InvalidAccountStateError(`${fieldName} must not be empty`);
  }

  return normalizedValue;
}

function requireValidDate(value: Date, fieldName: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new InvalidAccountStateError(`${fieldName} must be a valid date`);
  }

  return new Date(value.getTime());
}

function cloneDate(value: Date | null): Date | null {
  return value === null ? null : new Date(value.getTime());
}

function requireOptionalValidDate(
  value: Date | null,
  fieldName: string,
): Date | null {
  return value === null ? null : requireValidDate(value, fieldName);
}

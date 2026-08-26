import { AccountTokenType } from './enums/account-token-type';
import { InvalidAccountStateError } from './errors/invalid-account-state-error';
import { InvalidAccountTokenError } from './errors/invalid-account-token.error';

export interface AccountTokenProps {
  id: string;
  accountId: string;
  type: AccountTokenType;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
}

export interface CreateEmailVerificationTokenParams {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
}

export interface CreatePasswordResetTokenParams {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
}

export class AccountToken {
  private constructor(private readonly props: AccountTokenProps) {
    this.props.expiresAt = cloneDate(props.expiresAt) as Date;
    this.props.createdAt = cloneDate(props.createdAt) as Date;
    this.props.usedAt = cloneDate(props.usedAt);
  }

  static createEmailVerificationToken(params: CreateEmailVerificationTokenParams): AccountToken {
    const id = requireNonEmpty(params.id, 'Token ID');
    const accountId = requireNonEmpty(params.accountId, 'Account ID');
    const tokenHash = requireNonEmpty(params.tokenHash, 'Token hash');
    const expiresAt = requireValidDate(params.expiresAt, 'Token expiration');
    const now = requireValidDate(params.now, 'Creation Time');

    if (expiresAt.getTime() <= now.getTime()) {
      throw new InvalidAccountStateError('Token expiration must be in the future');
    }

    return new AccountToken({
      id,
      accountId,
      type: AccountTokenType.EMAIL_VERIFICATION,
      tokenHash,
      expiresAt,
      createdAt: now,
      usedAt: null,
    });
  }

  static createPasswordResetToken(params: CreatePasswordResetTokenParams): AccountToken {
    const id = requireNonEmpty(params.id, 'Token ID');
    const accountId = requireNonEmpty(params.accountId, 'Account ID');
    const tokenHash = requireNonEmpty(params.tokenHash, 'Token hash');
    const expiresAt = requireValidDate(params.expiresAt, 'Token expiration');
    const now = requireValidDate(params.now, 'Creation Time');

    if (expiresAt.getTime() <= now.getTime()) {
      throw new InvalidAccountStateError('Token expiration must be in the future');
    }

    return new AccountToken({
      id,
      accountId,
      type: AccountTokenType.PASSWORD_RESET,
      tokenHash,
      expiresAt,
      createdAt: now,
      usedAt: null,
    });
  }

  static rehydrate(props: AccountTokenProps): AccountToken {
    return new AccountToken({
      ...props,
      expiresAt: requireValidDate(props.expiresAt, 'Token expiration'),
      createdAt: requireValidDate(props.createdAt, 'Creation time'),
      usedAt: props.usedAt === null ? null : requireValidDate(props.usedAt, 'Used time'),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get type(): AccountTokenType {
    return this.props.type;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return cloneDate(this.props.expiresAt) as Date;
  }

  get createdAt(): Date {
    return cloneDate(this.props.createdAt) as Date;
  }

  get usedAt(): Date | null {
    return cloneDate(this.props.usedAt);
  }

  isUsed(): boolean {
    return this.props.usedAt !== null;
  }

  isExpired(now: Date): boolean {
    const currentTime = requireValidDate(now, 'Current time');

    return this.props.expiresAt.getTime() <= currentTime.getTime();
  }

  assertUsable(now: Date): void {
    if (this.isUsed() || this.isExpired(now)) {
      throw new InvalidAccountTokenError();
    }
  }

  markAsUsed(usedAt: Date): void {
    const consumptionTime = requireValidDate(usedAt, 'Used time');

    this.assertUsable(consumptionTime);

    this.props.usedAt = consumptionTime;
  }
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
    throw new InvalidAccountStateError(`${fieldName} must be a valid date.`);
  }

  return new Date(value.getTime());
}

function cloneDate(value: Date | null): Date | null {
  return value === null ? null : new Date(value.getTime());
}

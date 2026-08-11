import { AccountDomainError } from './account-domain.error';

export class AccountAlreadyVerifiedError extends AccountDomainError {
  constructor() {
    super("Account's email has already been verified.");
  }
}

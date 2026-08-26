import { AccountDomainError } from './account-domain.error';

export class InvalidAccountTokenError extends AccountDomainError {
  constructor() {
    super("Account's token is invalid or expired.");
  }
}

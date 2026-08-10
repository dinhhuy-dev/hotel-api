import { AccountDomainError } from './account-domain.error';

export class AccountNotActiveError extends AccountDomainError {
  constructor() {
    super('Account is not active.');
  }
}

import { AccountDomainError } from './account-domain.error';

export class InvalidAccountStateError extends AccountDomainError {
  constructor(message: string) {
    super(message);
  }
}

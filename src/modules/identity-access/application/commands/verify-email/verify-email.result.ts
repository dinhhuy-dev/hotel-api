import { AuthenticationResult } from './authentication.result';

export interface VerifyEmailResult {
  accountId: string;
  alreadyVerified: boolean;
  authentication: AuthenticationResult | null;
}

export interface VerificationEmailInput {
  email: string;
  accountId: string;
  token: string;
}

export interface PasswordResetEmailInput {
  email: string;
  accountId: string;
  token: string;
}

export interface EmailDeliveryResult {
  delivered: boolean;
}

export interface EmailServicePort {
  sendVerificationEmail(input: VerificationEmailInput): Promise<EmailDeliveryResult>;

  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<EmailDeliveryResult>;
}

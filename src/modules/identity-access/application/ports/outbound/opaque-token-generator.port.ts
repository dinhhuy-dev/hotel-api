export interface GeneratedOpaqueToken {
  token: string;
  expiresAt: Date;
}

export interface OpaqueTokenGeneratorPort {
  generateRefreshToken(): GeneratedOpaqueToken;
  generateEmailVerificationToken(): GeneratedOpaqueToken;
  generatePasswordResetToken(): GeneratedOpaqueToken;
}

export interface GeneratedOpaqueToken {
  token: string;
  expiresAt: Date;
}

export interface OpaqueTokenGeneratorPort {
  generateRefreshToken(): Promise<GeneratedOpaqueToken>;
  generateEmailVerificationToken(): Promise<GeneratedOpaqueToken>;
}

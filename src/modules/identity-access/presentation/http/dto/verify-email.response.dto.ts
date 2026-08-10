export class VerifyEmailResponseDto {
  accountId!: string;
  alreadyVerified!: boolean;
  accessToken?: string;
  refreshToken?: string;
}

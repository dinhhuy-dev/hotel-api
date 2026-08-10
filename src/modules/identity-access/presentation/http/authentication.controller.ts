import { Body, Controller, Post } from '@nestjs/common';
import { SignUpHandler } from '../../application/commands/sign-up/sign-up.handler';
import { SignInHandler } from '../../application/commands/sign-in/sign-in.handler';
import { VerifyEmailHandler } from '../../application/commands/verify-email/verify-email.handler';
import { RefreshTokenHandler } from '../../application/commands/refresh-token/refresh-token.handler';
import { SignUpRequestDto } from './dto/sign-up.request.dto';
import { SignUpCommand } from '../../application/commands/sign-up/sign-up.command';
import { SignUpResponseDto } from './dto/sign-up.response.dto';
import { VerifyEmailRequestDto } from './dto/verify-email.request.dto';
import { VerifyEmailResponseDto } from './dto/verify-email.response.dto';
import { VerifyEmailCommand } from '../../application/commands/verify-email/verify-email.command';
import { SingInRequestDto } from './dto/sign-in.request.dto';
import { AuthenticationResponseDto } from './dto/authentication.response.dto';
import { SignInCommand } from '../../application/commands/sign-in/sign-in.command';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { RefreshTokenCommand } from '../../application/commands/refresh-token/refresh-token.command';

@Controller('v1/auth')
export class AuthenticationController {
  constructor(
    private readonly signUpHandler: SignUpHandler,
    private readonly signInHandler: SignInHandler,
    private readonly verifyEmailHandler: VerifyEmailHandler,
    private readonly refreshTokenHandler: RefreshTokenHandler,
  ) {}

  @Post('sign-up')
  async signUp(@Body() dto: SignUpRequestDto): Promise<SignUpResponseDto> {
    const result = await this.signUpHandler.execute(
      new SignUpCommand(dto.email, dto.password),
    );

    return {
      accountId: result.accountId,
      verificationEmailSent: result.verificationEmailSent,
    };
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailRequestDto,
  ): Promise<VerifyEmailResponseDto> {
    const result = await this.verifyEmailHandler.execute(
      new VerifyEmailCommand(dto.token),
    );

    if (result.authentication === null) {
      return {
        accountId: result.accountId,
        alreadyVerified: result.alreadyVerified,
      };
    }

    return {
      accountId: result.accountId,
      alreadyVerified: result.alreadyVerified,
      accessToken: result.authentication.accessToken,
      refreshToken: result.authentication.refreshToken,
    };
  }

  @Post('sign-in')
  async signIn(
    @Body() dto: SingInRequestDto,
  ): Promise<AuthenticationResponseDto> {
    const result = await this.signInHandler.execute(
      new SignInCommand(dto.email, dto.password),
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<AuthenticationResponseDto> {
    const result = await this.refreshTokenHandler.execute(
      new RefreshTokenCommand(dto.token),
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }
}

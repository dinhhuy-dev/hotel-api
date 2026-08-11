import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
import { ForgotPasswordHandler } from '../../application/commands/forgot-password/forgot-password.handler';
import { ChangePasswordHandler } from '../../application/commands/change-password/change-password.handler';
import { ResetPasswordHandler } from '../../application/commands/reset-password/reset-password.handler';
import { ForgotPasswordRequestDto } from './dto/forgot-password.request.dto';
import { ForgotPasswordResponseDto } from './dto/forgot-password.response.dto';
import { ForgotPasswordCommand } from '../../application/commands/forgot-password/forgot-password.command';
import { ResetPasswordRequestDto } from './dto/reset-password.request.dto';
import { ResetPasswordCommand } from '../../application/commands/reset-password/reset-password.command';
import { CurrentUser } from './security/current-user.decorator';
import type { AuthenticatedUser } from './security/authenticated-user';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { ChangePasswordCommand } from '../../application/commands/change-password/change-password.command';
import { AuthGuard } from '@nestjs/passport';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutHandler } from '../../application/commands/logout/logout.handler';
import { LogoutCommand } from '../../application/commands/logout/logout.command';

@Controller('v1/auth')
export class AuthenticationController {
  constructor(
    private readonly signUpHandler: SignUpHandler,
    private readonly signInHandler: SignInHandler,
    private readonly verifyEmailHandler: VerifyEmailHandler,
    private readonly refreshTokenHandler: RefreshTokenHandler,
    private readonly forgotPasswordHandler: ForgotPasswordHandler,
    private readonly resetPasswordHandler: ResetPasswordHandler,
    private readonly changePasswordHandler: ChangePasswordHandler,
    private readonly logoutHandler: LogoutHandler,
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

  @Get('verify-email')
  async verifyEmail(
    @Query() dto: VerifyEmailRequestDto,
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

  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
  ): Promise<ForgotPasswordResponseDto> {
    await this.forgotPasswordHandler.execute(
      new ForgotPasswordCommand(dto.email),
    );

    return {
      message:
        'We will send a link to reset your password if your account exist.',
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordRequestDto): Promise<void> {
    await this.resetPasswordHandler.execute(
      new ResetPasswordCommand(dto.token, dto.newPassword),
    );
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangePasswordRequestDto,
  ): Promise<void> {
    await this.changePasswordHandler.execute(
      new ChangePasswordCommand(
        currentUser.accountId,
        dto.currentPassword,
        dto.newPassword,
      ),
    );
  }

  @Post('logout')
  async logout(@Body() dto: LogoutRequestDto): Promise<void> {
    await this.logoutHandler.execute(new LogoutCommand(dto.token));
  }
}

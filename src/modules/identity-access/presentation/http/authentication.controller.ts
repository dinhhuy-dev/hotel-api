import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiSuccessResponse,
  ApiSuccessVoidResponse,
} from '../../../../common/decorators/api-success-response.decorator';
import { ErrorResponseDto } from '../../../../common/presentation/http/dto/error-response.dto';
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
import { SignInRequestDto } from './dto/sign-in.request.dto';
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
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutHandler } from '../../application/commands/logout/logout.handler';
import { LogoutCommand } from '../../application/commands/logout/logout.command';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AccountRole } from '../../domain/enums/account-role';

@ApiTags('Authentication')
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

  @Public()
  @Post('sign-up')
  @ApiOperation({
    summary: 'Create an account',
    description: 'Create a new account and send an email verification link.',
  })
  @ApiSuccessResponse(SignUpResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Account created successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Request body is invalid.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Account could not be created.',
  })
  async signUp(@Body() dto: SignUpRequestDto): Promise<SignUpResponseDto> {
    const result = await this.signUpHandler.execute(new SignUpCommand(dto.email, dto.password));

    return {
      accountId: result.accountId,
      verificationEmailSent: result.verificationEmailSent,
    };
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({
    summary: "Verify user's account email address",
    description: 'Verify an account email address using a one-time token.',
  })
  @ApiSuccessResponse(VerifyEmailResponseDto, {
    status: HttpStatus.OK,
    description: 'Email address verified successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Verification query is invalid.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Email address could not be verified.',
  })
  async verifyEmail(@Query() dto: VerifyEmailRequestDto): Promise<VerifyEmailResponseDto> {
    const result = await this.verifyEmailHandler.execute(new VerifyEmailCommand(dto.token));

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

  @Public()
  @Post('sign-in')
  @ApiOperation({
    summary: 'Sign in to an account',
    description: 'Authenticate an account and issue access and refresh tokens.',
  })
  @ApiSuccessResponse(AuthenticationResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Authentication tokens issued successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Request body is invalid.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Account could not be authenticated.',
  })
  async signIn(@Body() dto: SignInRequestDto): Promise<AuthenticationResponseDto> {
    const result = await this.signInHandler.execute(new SignInCommand(dto.email, dto.password));

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh authentication tokens',
    description: 'Rotate the refresh token and issue a new token pair.',
  })
  @ApiSuccessResponse(AuthenticationResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Authentication tokens refreshed successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Request body is invalid.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Refresh token could not be processed.',
  })
  async refresh(@Body() dto: RefreshTokenRequestDto): Promise<AuthenticationResponseDto> {
    const result = await this.refreshTokenHandler.execute(new RefreshTokenCommand(dto.token));

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a password reset',
    description: 'Request a password reset email without disclosing account existence.',
  })
  @ApiSuccessResponse(ForgotPasswordResponseDto, {
    status: HttpStatus.ACCEPTED,
    description: 'The password reset request was accepted.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'The request body is invalid.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'The password reset request could not be processed.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto): Promise<ForgotPasswordResponseDto> {
    await this.forgotPasswordHandler.execute(new ForgotPasswordCommand(dto.email));

    return {
      message: 'We will send a link to reset your password if your account exists.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset an account password',
    description: 'Set a new password using a one-time password reset token.',
  })
  @ApiSuccessVoidResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'The request body is invalid.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'The password could not be reset.',
  })
  async resetPassword(@Body() dto: ResetPasswordRequestDto): Promise<void> {
    await this.resetPasswordHandler.execute(new ResetPasswordCommand(dto.token, dto.newPassword));
  }

  @Post('change-password')
  @Roles(AccountRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change the current account password',
    description: 'Change the password of the account represented by the access token.',
  })
  @ApiSuccessVoidResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Request body is invalid.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Access token is missing or invalid.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Password could not be changed.',
  })
  async changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangePasswordRequestDto,
  ): Promise<void> {
    await this.changePasswordHandler.execute(
      new ChangePasswordCommand(currentUser.accountId, dto.currentPassword, dto.newPassword),
    );
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out from the current refresh token',
    description: 'Revoke the refresh token supplied in the request body.',
  })
  @ApiSuccessVoidResponse({
    status: HttpStatus.OK,
    description: 'Refresh token revoked successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Request body is invalid.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Refresh token could not be revoked.',
  })
  async logout(@Body() dto: LogoutRequestDto): Promise<void> {
    await this.logoutHandler.execute(new LogoutCommand(dto.token));
  }
}

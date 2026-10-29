import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(loginDto);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { accessToken, user };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email with confirmation code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid code.' })
  async verify(
    @Body() verifyDto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.verifyEmail(verifyDto);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { accessToken, user };
  }

  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend confirmation code' })
  @ApiResponse({ status: 200, description: 'Code resent successfully.' })
  @ApiResponse({
    status: 400,
    description: 'User not found or already verified.',
  })
  async resendCode(@Body('email') email: string) {
    if (!email) {
      throw new UnauthorizedException('Email is required');
    }
    await this.authService.resendCode(email);
    return { success: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['refresh_token'];

    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { accessToken, refreshToken } =
      await this.authService.refreshTokens(token);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { accessToken };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully.' })
  async forgotPassword(@Body() forgotDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotDto.cpf);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetDto.token, resetDto.newPassword);
    return { success: true };
  }

  @Get('env-test')
  @ApiOperation({ summary: 'Test Environment Variables & Connections' })
  envTest() {
    const dbUri = process.env.MONGODB_URI || '';
    // Retorna apenas a parte final do banco para segurança (não vazar senhas)
    const dbName = dbUri.split('/').pop()?.split('?')[0] || 'unknown';
    const storageProject =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.AWS_BUCKET_NAME ||
      'unknown';
    const mongoConnected = Number(this.connection.readyState) === 1;
    const storageConfigured = Boolean(
      process.env.FIREBASE_CREDENTIALS_BASE64 || process.env.AWS_ACCESS_KEY,
    );

    const isProd =
      process.env.APP_ENV === 'production' ||
      dbName === 'ecp_prod' ||
      storageProject === 'esporteclubepelotas-admin';

    return {
      stage: isProd ? 'PROD' : 'DEV',
      environment: process.env.NODE_ENV || 'development',
      databaseSuffix: dbName,
      mongoConnected,
      storageProvider: process.env.STORAGE_PROVIDER || 'firebase',
      storageProject,
      storageConfigured,
    };
  }
}

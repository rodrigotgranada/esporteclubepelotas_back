import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UserEntity } from '../users/entities/user.entity.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { UserStatus } from '../users/schemas/user.schema.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByCpf(loginDto.cpf);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    this.usersService.checkLockout(user);



    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    
    if (!isPasswordValid) {
      await this.usersService.handleFailedLoginAttempt(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.resetLoginAttempts(user);

    const payload = { sub: user._id, email: user.email, role: user.role, status: user.status, tokenVersion: user.tokenVersion || 1 };
    
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' }); // 7 days

    const userObj = user.toObject();

    const userEntity = new UserEntity({
      id: userObj._id.toString(),
      firstName: userObj.firstName,
      lastName: userObj.lastName,
      email: userObj.email,
      role: userObj.role,
      status: userObj.status,
      isActive: userObj.isActive,
      passwordHash: userObj.passwordHash,
      cpf: userObj.cpf,
      avatarUrl: userObj.avatarUrl,
      addresses: userObj.addresses,
      phones: userObj.phones,
      birthDate: userObj.birthDate,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt,
      emailVerified: userObj.emailVerified,
    });

    return {
      accessToken,
      refreshToken,
      user: userEntity,
    };
  }

  async verifyEmail(verifyDto: VerifyEmailDto) {
    const user = await this.usersService.verifyUserCode(verifyDto.email, verifyDto.code);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Auto-login after successful verification
    const payload = { sub: user._id, email: user.email, role: user.role, status: user.status, tokenVersion: user.tokenVersion || 1 };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const userObj = user.toObject();

    const userEntity = new UserEntity({
      id: userObj._id.toString(),
      firstName: userObj.firstName,
      lastName: userObj.lastName,
      email: userObj.email,
      role: userObj.role,
      status: userObj.status,
      isActive: userObj.isActive,
      passwordHash: userObj.passwordHash,
      cpf: userObj.cpf,
      avatarUrl: userObj.avatarUrl,
      addresses: userObj.addresses,
      phones: userObj.phones,
      birthDate: userObj.birthDate,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt,
      emailVerified: userObj.emailVerified,
    });

    return {
      accessToken,
      refreshToken,
      user: userEntity,
    };
  }

  async resendCode(email: string) {
    return this.usersService.resendCode(email);
  }

  async refreshTokens(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token or inactive account');
      }

      const newPayload = { sub: user._id, email: user.email, role: user.role, status: user.status, tokenVersion: user.tokenVersion || 1 };
      
      const accessToken = this.jwtService.sign(newPayload);
      const refreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(cpf: string) {
    return this.usersService.generatePasswordResetToken(cpf);
  }

  async resetPassword(token: string, newPassword: string) {
    return this.usersService.resetPassword(token, newPassword);
  }
}

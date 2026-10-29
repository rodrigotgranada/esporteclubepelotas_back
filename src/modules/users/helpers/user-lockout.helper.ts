import { BadRequestException } from '@nestjs/common';
import { UserDocument, UserStatus } from '../schemas/user.schema.js';

export class UserLockoutHelper {
  static checkLockout(user: UserDocument): void {
    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Conta bloqueada por múltiplas tentativas falhas. Entre em contato com o suporte.');
    }
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new BadRequestException('Muitas tentativas falhas. Conta temporariamente bloqueada. Tente novamente em 10 minutos.');
    }
  }

  static async handleFailedLoginAttempt(user: UserDocument): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= 10) {
      user.status = UserStatus.BLOCKED;
      user.lockoutUntil = undefined;
    } else if (user.failedLoginAttempts >= 5) {
      user.lockoutUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    }
    
    await user.save();
  }

  static async resetLoginAttempts(user: UserDocument): Promise<void> {
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
      await user.save();
    }
  }
}

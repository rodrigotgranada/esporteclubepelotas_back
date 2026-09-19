import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserEntity } from './entities/user.entity.js';
import { VerificationCode, VerificationCodeDocument } from './schemas/verification-code.schema.js';
import { Inject } from '@nestjs/common';
import { STORAGE_PROVIDER_TOKEN, type IStorageProvider } from '../../common/providers/storage/storage.interface.js';
import { MAIL_PROVIDER_TOKEN, type IMailProvider } from '../../common/providers/mail/mail.interface.js';
import { getVerificationEmailTemplate } from '../../common/providers/mail/templates/verification.template.js';
import { getResetPasswordEmailTemplate } from '../../common/providers/mail/templates/reset-password.template.js';
import { UserStatus } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(VerificationCode.name) private verificationCodeModel: Model<VerificationCodeDocument>,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storageProvider: IStorageProvider,
    @Inject(MAIL_PROVIDER_TOKEN) private readonly mailProvider: IMailProvider,
  ) {}

  async createWithAvatar(createUserDto: CreateUserDto, file?: any): Promise<UserEntity> {
    const { email, cpf, password, ...rest } = createUserDto;

    // Check if email or CPF already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { cpf }],
    }).exec();

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already in use');
      }
      if (existingUser.cpf === cpf) {
        throw new ConflictException('CPF already in use');
      }
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate Confirmation Code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user
    const newUser = new this.userModel({
      ...rest,
      email,
      cpf,
      passwordHash,
      status: UserStatus.PENDING,
    });

    const savedUser = await newUser.save();

    // Create Verification Code in separate collection
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const verification = new this.verificationCodeModel({
      userId: savedUser._id,
      code: confirmationCode,
      // expiresAt defaults to 1h via TTL in schema but we can explicit set it if wanted, 
      // however mongoose TTL is based on the field value so we should set it:
      expiresAt
    });
    await verification.save();
    
    // Upload Avatar se houver
    let finalAvatarUrl = undefined;
    if (file) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }
      const folder = process.env.NODE_ENV === 'production' ? `prod/users/${savedUser._id}` : `users/${savedUser._id}`;
      const fileName = '_profile.jpg';
      finalAvatarUrl = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);
      
      // Update DB with Avatar URL
      await this.userModel.findByIdAndUpdate(savedUser._id, { avatarUrl: finalAvatarUrl });
      savedUser.avatarUrl = finalAvatarUrl;
    }

    // Disparar e-mail com confirmationCode para savedUser.email
    await this.mailProvider.sendMail(
      savedUser.email,
      'Seu código de verificação - E.C. Pelotas',
      getVerificationEmailTemplate(confirmationCode, false, expiresAt)
    );
    console.log(`[Email Disparado] Para: ${savedUser.email} - Código: ${confirmationCode}`);

    // Converte para Entity aplicando @Exclude do ClassSerializerInterceptor
    const userObject = savedUser.toObject();
    return new UserEntity({
      id: userObject._id.toString(),
      firstName: userObject.firstName,
      lastName: userObject.lastName,
      email: userObject.email,
      passwordHash: userObject.passwordHash,
      cpf: userObject.cpf,
      avatarUrl: userObject.avatarUrl,
      role: userObject.role,
      status: userObject.status,
      isActive: userObject.isActive,
    });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByCpf(cpf: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ cpf }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async verifyUserCode(email: string, code: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already verified');
    }

    this.checkLockout(user);

    const verificationRecord = await this.verificationCodeModel.findOne({
      userId: user._id,
      code,
    }).exec();

    if (!verificationRecord) {
      await this.handleFailedLoginAttempt(user);
      throw new BadRequestException('Invalid or expired confirmation code');
    }

    // Activate user
    user.status = UserStatus.ACTIVE;
    await this.resetLoginAttempts(user);
    await user.save();

    // Delete the used code
    await this.verificationCodeModel.deleteOne({ _id: verificationRecord._id }).exec();

    return user;
  }

  async resendCode(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already verified');
    }

    // Delete existing codes for this user
    await this.verificationCodeModel.deleteMany({ userId: user._id }).exec();

    // Generate new code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const verification = new this.verificationCodeModel({
      userId: user._id,
      code: newCode,
      expiresAt
    });
    await verification.save();

    await this.mailProvider.sendMail(
      user.email,
      'Novo código de verificação - E.C. Pelotas',
      getVerificationEmailTemplate(newCode, true, expiresAt)
    );
    console.log(`[Email Disparado] Para: ${user.email} - NOVO Código: ${newCode}`);
  }

  async updateAvatar(userId: string, file: any): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    const folder = process.env.NODE_ENV === 'production' ? `prod/users/${userId}` : `users/${userId}`;
    const fileName = '_profile.jpg'; // O usuário quer exatamente _profile.jpg no final

    const url = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);

    await this.userModel.findByIdAndUpdate(userId, { avatarUrl: url });

    return { url };
  }

  async checkAvailability(type: 'email' | 'cpf', value: string): Promise<boolean> {
    const user = await this.userModel.findOne({ [type]: value }).exec();
    return !user;
  }

  checkLockout(user: UserDocument): void {
    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Conta bloqueada por múltiplas tentativas falhas. Entre em contato com o suporte.');
    }
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new BadRequestException('Muitas tentativas falhas. Conta temporariamente bloqueada. Tente novamente em 10 minutos.');
    }
  }

  async handleFailedLoginAttempt(user: UserDocument): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= 10) {
      user.status = UserStatus.BLOCKED;
      user.lockoutUntil = undefined;
    } else if (user.failedLoginAttempts >= 5) {
      user.lockoutUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    }
    
    await user.save();
  }

  async resetLoginAttempts(user: UserDocument): Promise<void> {
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
      await user.save();
    }
  }

  async generatePasswordResetToken(cpf: string): Promise<{ email: string }> {
    const user = await this.findByCpf(cpf);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    const { randomBytes } = await import('crypto');
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:7999';
    
    await this.mailProvider.sendMail(
      user.email,
      'Redefinição de Senha - E.C. Pelotas',
      getResetPasswordEmailTemplate(frontendUrl, resetToken, resetExpires)
    );

    return { email: user.email };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).exec();

    if (!user) {
      throw new BadRequestException('Token de redefinição inválido ou expirado');
    }

    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Zera os bloqueios caso a conta estivesse trancada
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    
    // Destranca se estiver BLOCKED
    if (user.status === UserStatus.BLOCKED) {
      user.status = UserStatus.ACTIVE; // Ou PENDING se não estava verificado, mas vamos simplificar assumindo ACTIVE ou preservar pending.
      // Melhor, só volta pra active se tava blocked. Se tava pending, fica pending.
    }

    await user.save();
  }
}

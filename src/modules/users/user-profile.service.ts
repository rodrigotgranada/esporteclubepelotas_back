import { Injectable, ConflictException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema.js';
import { UserEntity } from './entities/user.entity.js';
import { getAuth } from 'firebase-admin/auth';
import { MAIL_PROVIDER_TOKEN, type IMailProvider } from '../../common/providers/mail/mail.interface.js';
import { getChangeEmailTemplate, getChangePhoneTemplate } from '../../common/providers/mail/templates/contact-change.template.js';

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(MAIL_PROVIDER_TOKEN) private readonly mailProvider: IMailProvider,
  ) {}

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new BadRequestException('User not found');

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Increment tokenVersion to invalidate all existing sessions
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    
    await user.save();
  }

  async requestChange(userId: string, type: 'email' | 'phone', newValue: string, currentPassword: string): Promise<UserEntity> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new BadRequestException('User not found');

    // Validate current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    if (type === 'email') {
      if (user.email === newValue && user.emailVerified) {
        throw new BadRequestException('O novo e-mail deve ser diferente do e-mail atual.');
      }
      const existing = await this.userModel.findOne({ email: newValue }).exec();
      if (existing) throw new ConflictException('Este e-mail já está em uso por outra conta.');
    } else {
      const currentPhone = user.phones?.[0];
      if (currentPhone?.number === newValue && currentPhone?.isVerified) {
        throw new BadRequestException('O novo celular deve ser diferente do celular atual.');
      }
      const existing = await this.userModel.findOne({ 'phones.number': newValue }).exec();
      if (existing && existing._id.toString() !== userId) {
        throw new ConflictException('Este número já está em uso por outra conta.');
      }
    }

    // Remove any existing pending change of the same type
    user.pendingChanges = (user.pendingChanges || []).filter(c => c.type !== type);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    user.pendingChanges.push({ type, newValue, code, expiresAt });
    user.markModified('pendingChanges');
    await user.save();

    if (type === 'email') {
      // Send OTP to the NEW email so user confirms access to it
      const subject = 'E.C. Pelotas — Confirme a alteração do seu e-mail';
      const body = getChangeEmailTemplate(code, newValue, expiresAt);
      await this.mailProvider.sendMail(newValue, subject, body);
      this.logger.log(`[Email] Código de alteração enviado para o novo e-mail: ${newValue}`);
    } else {
      // SMS not available yet — send OTP to the CURRENT registered email
      const subject = 'E.C. Pelotas — Confirme a alteração do seu celular';
      const body = getChangePhoneTemplate(code, newValue, expiresAt);
      await this.mailProvider.sendMail(user.email, subject, body);
      this.logger.log(`[Email] Código de alteração de celular enviado para o e-mail cadastrado: ${user.email}`);
    }

    const obj = user.toObject();
    return new UserEntity({
      id: obj._id.toString(),
      firstName: obj.firstName,
      lastName: obj.lastName,
      email: obj.email,
      emailVerified: obj.emailVerified,
      cpf: obj.cpf,
      avatarUrl: obj.avatarUrl,
      role: obj.role,
      status: obj.status,
      isActive: obj.isActive,
      addresses: obj.addresses,
      phones: obj.phones,
      pendingChanges: obj.pendingChanges,
    });
  }

  async confirmChange(userId: string, type: 'email' | 'phone', code: string): Promise<UserEntity> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new BadRequestException('User not found');

    const pendingChangeIndex = (user.pendingChanges || []).findIndex(c => c.type === type);
    if (pendingChangeIndex === -1) {
      throw new BadRequestException(`Nenhuma solicitação de alteração de ${type} pendente.`);
    }

    const pendingChange = user.pendingChanges[pendingChangeIndex];

    if (new Date() > pendingChange.expiresAt) {
      user.pendingChanges.splice(pendingChangeIndex, 1);
      await user.save();
      throw new BadRequestException('Código expirado. Solicite novamente.');
    }

    if (pendingChange.code !== code) {
      throw new BadRequestException('Código de confirmação incorreto.');
    }

    if (type === 'email') {
      const existingUser = await this.userModel.findOne({ email: pendingChange.newValue }).exec();
      if (existingUser) throw new ConflictException('Email já está em uso.');
      user.email = pendingChange.newValue;
      user.emailVerified = true;
    } else if (type === 'phone') {
      if (!user.phones || user.phones.length === 0) {
        user.phones = [{ number: pendingChange.newValue, isPrimary: true, isWhatsapp: false, isVerified: true }];
      } else {
        user.phones[0].number = pendingChange.newValue;
        user.phones[0].isVerified = true;
      }
    }

    user.pendingChanges.splice(pendingChangeIndex, 1);
    await user.save();

    const obj = user.toObject();
    return new UserEntity({
      id: obj._id.toString(),
      firstName: obj.firstName,
      lastName: obj.lastName,
      email: obj.email,
      emailVerified: obj.emailVerified,
      cpf: obj.cpf,
      avatarUrl: obj.avatarUrl,
      role: obj.role,
      status: obj.status,
      isActive: obj.isActive,
      addresses: obj.addresses,
      phones: obj.phones,
      pendingChanges: obj.pendingChanges,
    });
  }

  async confirmFirebasePhone(userId: string, idToken: string, currentPassword?: string): Promise<UserEntity> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new BadRequestException('User not found');

    if (currentPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new BadRequestException('Senha atual incorreta.');
      }
    }

    let decodedToken: any;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (err) {
      this.logger.error(`Firebase Auth Error: ${err}`);
      throw new BadRequestException('Falha ao validar o token do Firebase.');
    }

    const phoneNumber = decodedToken.phone_number;
    if (!phoneNumber) {
      throw new BadRequestException('Token não contém número de telefone.');
    }

    // Check if phone already in use by someone else
    const existing = await this.userModel.findOne({ 'phones.number': phoneNumber }).exec();
    if (existing && existing._id.toString() !== userId) {
      throw new ConflictException('Este número já está em uso por outra conta.');
    }

    if (!user.phones || user.phones.length === 0) {
      user.phones = [{ number: phoneNumber, isPrimary: true, isWhatsapp: false, isVerified: true }];
    } else {
      user.phones[0].number = phoneNumber;
      user.phones[0].isVerified = true;
    }

    // Remove any pending phone changes
    user.pendingChanges = (user.pendingChanges || []).filter(c => c.type !== 'phone');
    user.markModified('pendingChanges');
    
    user.tokenVersion = (user.tokenVersion || 1) + 1;

    await user.save();

    const obj = user.toObject();
    return new UserEntity({
      id: obj._id.toString(),
      firstName: obj.firstName,
      lastName: obj.lastName,
      email: obj.email,
      emailVerified: obj.emailVerified,
      cpf: obj.cpf,
      avatarUrl: obj.avatarUrl,
      role: obj.role,
      status: obj.status,
      isActive: obj.isActive,
      addresses: obj.addresses,
      phones: obj.phones,
      pendingChanges: obj.pendingChanges,
    });
  }
}

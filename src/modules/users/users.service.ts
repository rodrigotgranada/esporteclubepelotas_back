import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
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
import { getChangeEmailTemplate, getChangePhoneTemplate } from '../../common/providers/mail/templates/contact-change.template.js';
import { UserStatus } from './schemas/user.schema.js';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(VerificationCode.name) private verificationCodeModel: Model<VerificationCodeDocument>,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storageProvider: IStorageProvider,
    @Inject(MAIL_PROVIDER_TOKEN) private readonly mailProvider: IMailProvider,
    @InjectModel('Role') private roleModel: Model<any>,
  ) {}

  private readonly logger = new Logger(UsersService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePendingUsersCleanup() {
    this.logger.log('Iniciando limpeza de usuários PENDING expirados...');
    const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 horas atrás

    const result = await this.userModel.deleteMany({
      status: UserStatus.PENDING,
      createdAt: { $lt: expirationTime },
    }).exec();

    if (result.deletedCount > 0) {
      this.logger.log(`Limpeza concluída: ${result.deletedCount} usuários removidos.`);
    } else {
      this.logger.log('Nenhum usuário expirado encontrado.');
    }
  }

  private mapToEntity(user: UserDocument): UserEntity {
    const obj = user.toObject();
    return new UserEntity({
      id: obj._id.toString(),
      firstName: obj.firstName,
      lastName: obj.lastName,
      email: obj.email,
      emailVerified: obj.emailVerified,
      passwordHash: obj.passwordHash,
      cpf: obj.cpf,
      avatarUrl: obj.avatarUrl,
      role: obj.role,
      status: obj.status,
      isActive: obj.isActive,
      birthDate: obj.birthDate,
      preferences: obj.preferences,
      addresses: obj.addresses,
      phones: obj.phones,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      pendingChanges: obj.pendingChanges,
    });
  }

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

    let savedUser;
    try {
      savedUser = await newUser.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Email ou CPF já está em uso.');
      }
      throw error;
    }

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

    return this.mapToEntity(savedUser);
  }

  async adminCreateWithAvatar(createUserDto: CreateUserDto, file?: any): Promise<UserEntity> {
    const { email, cpf, password, role, ...rest } = createUserDto;

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

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = new this.userModel({
      ...rest,
      email,
      cpf,
      passwordHash,
      role: role || (await this.roleModel.findOne({ name: 'USER' }))._id,
      status: UserStatus.ACTIVE, // Admin creates as ACTIVE directly
    });

    let savedUser;
    try {
      savedUser = await newUser.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Email ou CPF já está em uso.');
      }
      throw error;
    }

    let finalAvatarUrl = undefined;
    if (file) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }
      const folder = process.env.NODE_ENV === 'production' ? `prod/users/${savedUser._id}` : `users/${savedUser._id}`;
      const fileName = '_profile.jpg';
      finalAvatarUrl = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);
      
      await this.userModel.findByIdAndUpdate(savedUser._id, { avatarUrl: finalAvatarUrl });
      savedUser.avatarUrl = finalAvatarUrl;
    }

    // TODO: Send a Welcome Email (without code)
    // await this.mailProvider.sendMail(...)

    return this.mapToEntity(savedUser);
  }

  private checkHierarchy(actorRole: any, targetRole: any, actionType: 'edit' | 'promote' = 'edit'): void {
    // temporarily extracting name if populated, or assume it's just passing the object
    const actorName = typeof actorRole === 'string' ? actorRole : (actorRole?.name || '');
    const targetName = typeof targetRole === 'string' ? targetRole : (targetRole?.name || '');

    if (actorName === 'OWNER') return;

    if (actorName === 'ADMIN') {
      if (targetName === 'OWNER') {
        throw new BadRequestException(`Admins não têm permissão para ${actionType === 'promote' ? 'promover para' : 'modificar um'} Owner.`);
      }
      return;
    }

    throw new BadRequestException('Ação não permitida para o seu nível de acesso.');
  }

  async adminUpdate(id: string, updateData: any, actor: any): Promise<UserEntity> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');

    this.checkHierarchy(actor.role, user.role, 'edit');
    if (updateData.role) {
      this.checkHierarchy(actor.role, updateData.role, 'promote');
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await this.findByEmail(updateData.email);
      if (existingEmail) throw new ConflictException('Email already in use');
      user.email = updateData.email;
    }

    if (updateData.cpf && updateData.cpf !== user.cpf) {
      const existingCpf = await this.findByCpf(updateData.cpf);
      if (existingCpf) throw new ConflictException('CPF already in use');
      user.cpf = updateData.cpf;
    }

    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.role) user.role = updateData.role;
    if (updateData.status) user.status = updateData.status;
    if (updateData.birthDate) user.birthDate = updateData.birthDate;
    if (updateData.phones) {
      user.phones = updateData.phones;
      user.markModified('phones');
    }
    if (updateData.addresses) {
      user.addresses = updateData.addresses;
      user.markModified('addresses');
    }
    if (updateData.preferences) {
      user.preferences = { ...user.preferences, ...updateData.preferences };
      user.markModified('preferences');
    }
    
    if (updateData.password) {
      const saltRounds = 10;
      user.passwordHash = await bcrypt.hash(updateData.password, saltRounds);
    }

    await user.save();
    
    return this.mapToEntity(user);
  }

  async updateStatus(id: string, status: UserStatus, actor: any): Promise<UserEntity> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');
    
    this.checkHierarchy(actor.role, user.role, 'edit');

    user.status = status;
    if (status === UserStatus.ACTIVE) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
    }
    
    await user.save();
    
    return this.mapToEntity(user);
  }

  async updateRole(id: string, role: any, actor: any): Promise<UserEntity> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');
    
    this.checkHierarchy(actor.role, user.role, 'edit');
    this.checkHierarchy(actor.role, role, 'promote');

    user.role = role;
    await user.save();
    
    return this.mapToEntity(user);
  }

  async adminSoftDelete(id: string, actor: any): Promise<void> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');

    this.checkHierarchy(actor.role, user.role, 'edit');

    user.isActive = false;
    user.status = UserStatus.INACTIVE;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    await user.save();
  }

  async adminResendVerification(id: string, actor: any): Promise<void> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');

    this.checkHierarchy(actor.role, user.role, 'edit');

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Usuário já está verificado.');
    }

    await this.verificationCodeModel.deleteMany({ userId: user._id }).exec();

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
  }

  async adminForcePasswordReset(id: string, actor: any): Promise<void> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');

    this.checkHierarchy(actor.role, user.role, 'edit');

    const { randomBytes } = await import('crypto');
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:7999';
    
    await this.mailProvider.sendMail(
      user.email,
      'Redefinição de Senha Solicitada pelo Administrador - E.C. Pelotas',
      getResetPasswordEmailTemplate(frontendUrl, resetToken, resetExpires)
    );
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).populate('role').exec();
  }

  async findByCpf(cpf: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ cpf }).populate('role').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).populate('role').exec();
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
    user.emailVerified = true;
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

  async findAll(page = 1, limit = 10, search?: string, role?: string, status?: string): Promise<{ data: UserEntity[], total: number, page: number, limit: number }> {
    const query: any = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) query.role = role;
    
    if (status && status !== 'ALL') {
      query.status = status;
    } else if (!status || status !== 'ALL') {
      // By default (when status is empty or undefined), show active/pending/blocked but NOT INACTIVE
      // Because we changed frontend to pass ALL when it really wants everything
      query.isActive = true;
    }
    
    // If status === 'ALL', we do nothing to query.status or query.isActive, 
    // so it will naturally return absolutely everyone in the database.

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel.find(query).populate('role').skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    const data = users.map(u => this.mapToEntity(u));

    return { data, total, page, limit };
  }

  async updateMe(id: string, updateData: any): Promise<UserEntity> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new BadRequestException('User not found');
    
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    
    if (updateData.addresses !== undefined) {
      if (updateData.addresses.length === 0 && (user.addresses && user.addresses.length > 0)) {
        throw new BadRequestException('Você não pode excluir todos os seus endereços. É necessário ter pelo menos um endereço cadastrado.');
      }
      user.addresses = updateData.addresses;
      user.markModified('addresses');
    }
    if (updateData.phones) {
      user.phones = updateData.phones;
      user.markModified('phones');
    }
    if (updateData.preferences) {
      user.preferences = { ...user.preferences, ...updateData.preferences };
      user.markModified('preferences');
    }
    if (updateData.avatarUrl !== undefined) user.avatarUrl = updateData.avatarUrl;

    await user.save();
    
    return this.mapToEntity(user);
  }

  async deactivateMe(id: string, password?: string): Promise<void> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new BadRequestException('User not found');
    
    if (!password) {
      throw new BadRequestException('A senha é obrigatória para excluir a conta.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Senha atual incorreta.');
    }
    
    // Soft delete
    user.isActive = false;
    user.status = UserStatus.INACTIVE;
    
    // Increment tokenVersion to invalidate all existing sessions
    user.tokenVersion = (user.tokenVersion || 1) + 1;

    await user.save();
  }
}

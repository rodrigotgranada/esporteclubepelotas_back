import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserStatus } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserEntity } from './entities/user.entity.js';
import { VerificationCode, VerificationCodeDocument } from './schemas/verification-code.schema.js';
import { Inject } from '@nestjs/common';
import { STORAGE_PROVIDER_TOKEN, type IStorageProvider } from '../../common/providers/storage/storage.interface.js';
import { MAIL_PROVIDER_TOKEN, type IMailProvider } from '../../common/providers/mail/mail.interface.js';
import { getVerificationEmailTemplate } from '../../common/providers/mail/templates/verification.template.js';
import { getResetPasswordEmailTemplate } from '../../common/providers/mail/templates/reset-password.template.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserHierarchyHelper } from './helpers/user-hierarchy.helper.js';
import { UserLockoutHelper } from './helpers/user-lockout.helper.js';

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
    const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000);

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
      role: obj.role
        ? (typeof obj.role === 'object' && obj.role._id
            ? { ...obj.role, _id: obj.role._id.toString() }
            : obj.role.toString())
        : undefined,
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

    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { cpf }],
    }).exec();

    if (existingUser) {
      if (existingUser.email === email) throw new ConflictException('Email already in use');
      if (existingUser.cpf === cpf) throw new ConflictException('CPF already in use');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new this.userModel({
      ...rest,
      email,
      cpf,
      passwordHash,
      status: UserStatus.PENDING,
    });

    let savedUser: UserDocument;
    try {
      savedUser = await newUser.save();
    } catch (error: any) {
      if (error.code === 11000) throw new ConflictException('Email ou CPF já está em uso.');
      throw error;
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const verification = new this.verificationCodeModel({
      userId: savedUser._id,
      code: confirmationCode,
      expiresAt,
    });
    await verification.save();
    
    if (file) {
      if (!file.mimetype.startsWith('image/')) throw new BadRequestException('File must be an image');
      const folder = process.env.NODE_ENV === 'production' ? `prod/users/${savedUser._id}` : `users/${savedUser._id}`;
      const fileName = '_profile.jpg';
      const finalAvatarUrl = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);
      await this.userModel.findByIdAndUpdate(savedUser._id, { avatarUrl: finalAvatarUrl });
      savedUser.avatarUrl = finalAvatarUrl;
    }

    await this.mailProvider.sendMail(
      savedUser.email,
      'Seu código de verificação - E.C. Pelotas',
      getVerificationEmailTemplate(confirmationCode, false, expiresAt),
    );

    return this.mapToEntity(savedUser);
  }

  async adminCreateWithAvatar(createUserDto: CreateUserDto, file?: any): Promise<UserEntity> {
    const { email, cpf, password, role, ...rest } = createUserDto;

    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { cpf }],
    }).exec();

    if (existingUser) {
      if (existingUser.email === email) throw new ConflictException('Email already in use');
      if (existingUser.cpf === cpf) throw new ConflictException('CPF already in use');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let assignedRoleId = role;
    if (!assignedRoleId) {
      const defaultRole = await this.roleModel.findOne({ name: 'USER' }).exec();
      assignedRoleId = defaultRole?._id;
    } else if (typeof assignedRoleId === 'string' && !Types.ObjectId.isValid(assignedRoleId)) {
      const roleDoc = await this.roleModel.findOne({ name: assignedRoleId.toUpperCase() }).exec();
      if (roleDoc) assignedRoleId = roleDoc._id;
    }

    const newUser = new this.userModel({
      ...rest,
      email,
      cpf,
      passwordHash,
      role: assignedRoleId,
      status: UserStatus.ACTIVE,
    });

    let savedUser: UserDocument;
    try {
      savedUser = await newUser.save();
    } catch (error: any) {
      if (error.code === 11000) throw new ConflictException('Email ou CPF já está em uso.');
      throw error;
    }

    if (file) {
      if (!file.mimetype.startsWith('image/')) throw new BadRequestException('File must be an image');
      const folder = process.env.NODE_ENV === 'production' ? `prod/users/${savedUser._id}` : `users/${savedUser._id}`;
      const fileName = '_profile.jpg';
      const finalAvatarUrl = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);
      await this.userModel.findByIdAndUpdate(savedUser._id, { avatarUrl: finalAvatarUrl });
      savedUser.avatarUrl = finalAvatarUrl;
    }

    return this.mapToEntity(savedUser);
  }

  async checkHierarchy(actorRole: any, targetRole: any, actionType: 'edit' | 'promote' = 'edit'): Promise<void> {
    return UserHierarchyHelper.checkHierarchy(this.roleModel, actorRole, targetRole, actionType);
  }

  async adminUpdate(id: string, updateData: any, actor: any): Promise<UserEntity> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');

    await this.checkHierarchy(actor.role, user.role, 'edit');
    if (updateData.role) {
      const roleStr = typeof updateData.role === 'object'
        ? (updateData.role._id?.toString() || updateData.role.name || updateData.role.toString())
        : String(updateData.role);
      await this.checkHierarchy(actor.role, roleStr, 'promote');
      if (!Types.ObjectId.isValid(roleStr)) {
        const roleDoc = await this.roleModel.findOne({ name: roleStr.toUpperCase() }).exec();
        if (!roleDoc) throw new BadRequestException('Cargo informado não existe.');
        user.role = roleDoc._id;
      } else {
        user.role = roleStr;
      }
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await this.findByEmail(updateData.email);
      if (existingEmail && existingEmail._id.toString() !== user._id.toString()) {
        throw new ConflictException('Email already in use');
      }
      user.email = updateData.email;
    }

    if (updateData.cpf && updateData.cpf !== user.cpf) {
      const existingCpf = await this.findByCpf(updateData.cpf);
      if (existingCpf && existingCpf._id.toString() !== user._id.toString()) {
        throw new ConflictException('CPF already in use');
      }
      user.cpf = updateData.cpf;
    }

    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.status) user.status = updateData.status;
    if (updateData.birthDate) user.birthDate = updateData.birthDate;
    if (updateData.avatarUrl !== undefined) user.avatarUrl = updateData.avatarUrl;
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
    
    await this.checkHierarchy(actor.role, user.role, 'edit');

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
    
    await this.checkHierarchy(actor.role, user.role, 'edit');
    await this.checkHierarchy(actor.role, role, 'promote');

    let targetRoleId = role;
    if (typeof role === 'string' && !Types.ObjectId.isValid(role)) {
      const roleDoc = await this.roleModel.findOne({ name: role.toUpperCase() }).exec();
      if (!roleDoc) throw new BadRequestException('Cargo informado não existe.');
      targetRoleId = roleDoc._id;
    }

    user.role = targetRoleId;
    await user.save();
    return this.mapToEntity(user);
  }

  async adminSoftDelete(id: string, actor: any): Promise<void> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');

    await this.checkHierarchy(actor.role, user.role, 'edit');

    user.isActive = false;
    user.status = UserStatus.INACTIVE;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    await user.save();
  }

  async adminResendVerification(id: string, actor: any): Promise<void> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');

    await this.checkHierarchy(actor.role, user.role, 'edit');

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Usuário já está verificado.');
    }

    await this.verificationCodeModel.deleteMany({ userId: user._id }).exec();

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const verification = new this.verificationCodeModel({
      userId: user._id,
      code: newCode,
      expiresAt,
    });
    await verification.save();

    await this.mailProvider.sendMail(
      user.email,
      'Novo código de verificação - E.C. Pelotas',
      getVerificationEmailTemplate(newCode, true, expiresAt),
    );
  }

  async adminForcePasswordReset(id: string, actor: any): Promise<void> {
    const user = await this.userModel.findById(id).populate('role').exec();
    if (!user) throw new BadRequestException('User not found');

    await this.checkHierarchy(actor.role, user.role, 'edit');

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
      getResetPasswordEmailTemplate(frontendUrl, resetToken, resetExpires),
    );
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).populate('role').exec();
  }

  async findByCpf(cpf: string): Promise<UserDocument | null> {
    const cleanCpf = cpf.replace(/\D/g, '');
    const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return this.userModel.findOne({ cpf: { $in: [cpf, cleanCpf, formattedCpf] } }).populate('role').exec();
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

    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    await this.resetLoginAttempts(user);
    await user.save();

    await this.verificationCodeModel.deleteOne({ _id: verificationRecord._id }).exec();
    return user;
  }

  async resendCode(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.status === UserStatus.ACTIVE) throw new BadRequestException('User is already verified');

    await this.verificationCodeModel.deleteMany({ userId: user._id }).exec();
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const verification = new this.verificationCodeModel({
      userId: user._id,
      code: newCode,
      expiresAt,
    });
    await verification.save();

    await this.mailProvider.sendMail(
      user.email,
      'Novo código de verificação - E.C. Pelotas',
      getVerificationEmailTemplate(newCode, true, expiresAt),
    );
  }

  async updateAvatar(userId: string, file: any): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('File must be an image');

    const folder = process.env.NODE_ENV === 'production' ? `prod/users/${userId}` : `users/${userId}`;
    const fileName = '_profile.jpg';
    const url = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);

    await this.userModel.findByIdAndUpdate(userId, { avatarUrl: url });
    return { url };
  }

  async checkAvailability(type: 'email' | 'cpf', value: string): Promise<boolean> {
    const user = await this.userModel.findOne({ [type]: value }).exec();
    return !user;
  }

  checkLockout(user: UserDocument): void {
    UserLockoutHelper.checkLockout(user);
  }

  async handleFailedLoginAttempt(user: UserDocument): Promise<void> {
    return UserLockoutHelper.handleFailedLoginAttempt(user);
  }

  async resetLoginAttempts(user: UserDocument): Promise<void> {
    return UserLockoutHelper.resetLoginAttempts(user);
  }

  async generatePasswordResetToken(cpf: string): Promise<{ email: string }> {
    const user = await this.findByCpf(cpf);
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const { randomBytes } = await import('crypto');
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:7999';
    await this.mailProvider.sendMail(
      user.email,
      'Redefinição de Senha - E.C. Pelotas',
      getResetPasswordEmailTemplate(frontendUrl, resetToken, resetExpires),
    );

    return { email: user.email };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).exec();

    if (!user) throw new BadRequestException('Token de redefinição inválido ou expirado');

    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    
    if (user.status === UserStatus.BLOCKED) {
      user.status = UserStatus.ACTIVE;
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

    if (role) {
      if (Types.ObjectId.isValid(role) && String(new Types.ObjectId(role)) === role) {
        query.role = new Types.ObjectId(role);
      } else {
        const roleDoc = await this.roleModel.findOne({
          name: { $regex: new RegExp(`^${role}$`, 'i') },
        }).exec();
        if (roleDoc) {
          query.role = roleDoc._id;
        } else {
          const altDoc = await this.roleModel.findOne({
            name: { $in: ['SOCIO', 'SOCIETY'] },
          }).exec();
          if (altDoc && (role.toUpperCase() === 'SOCIO' || role.toUpperCase() === 'SOCIETY')) {
            query.role = altDoc._id;
          } else {
            query.role = null;
          }
        }
      }
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

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
    
    user.isActive = false;
    user.status = UserStatus.INACTIVE;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    await user.save();
  }
}

import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserEntity } from './entities/user.entity.js';
import { FirebaseStorageProvider } from '../../common/providers/storage/firebase.provider.js';
import { UserStatus } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly storageProvider: FirebaseStorageProvider
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
      confirmationCode,
    });

    const savedUser = await newUser.save();
    
    // Upload Avatar se houver
    let finalAvatarUrl = undefined;
    if (file) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }
      const folder = process.env.NODE_ENV === 'production' ? `prod/users/${savedUser._id}` : `dev/users/${savedUser._id}`;
      const fileName = '_profile.jpg';
      finalAvatarUrl = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);
      
      // Update DB with Avatar URL
      await this.userModel.findByIdAndUpdate(savedUser._id, { avatarUrl: finalAvatarUrl });
      savedUser.avatarUrl = finalAvatarUrl;
    }

    // TODO: Disparar e-mail com confirmationCode para savedUser.email
    console.log(`[Mock Email] Para: ${savedUser.email} - Código: ${confirmationCode}`);

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

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async verifyUserCode(email: string, code: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already verified');
    }

    if (user.confirmationCode !== code) {
      throw new BadRequestException('Invalid confirmation code');
    }

    user.status = UserStatus.ACTIVE;
    user.confirmationCode = undefined;
    await user.save();

    return user;
  }

  async updateAvatar(userId: string, file: any): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    const folder = process.env.NODE_ENV === 'production' ? `prod/users/${userId}` : `dev/users/${userId}`;
    const fileName = '_profile.jpg'; // O usuário quer exatamente _profile.jpg no final

    const url = await this.storageProvider.uploadFile(file.buffer, fileName, folder, file.mimetype);

    await this.userModel.findByIdAndUpdate(userId, { avatarUrl: url });

    return { url };
  }
}

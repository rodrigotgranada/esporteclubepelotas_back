import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserEntity } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
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

    // Create user
    const newUser = new this.userModel({
      ...rest,
      email,
      cpf,
      passwordHash,
    });

    const savedUser = await newUser.save();
    
    // Converte para Entity aplicando @Exclude do ClassSerializerInterceptor
    const userObject = savedUser.toObject();
    return new UserEntity({
      id: userObject._id.toString(),
      firstName: userObject.firstName,
      lastName: userObject.lastName,
      email: userObject.email,
      passwordHash: userObject.passwordHash,
      cpf: userObject.cpf,
      role: userObject.role,
      isActive: userObject.isActive,
    });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }
}

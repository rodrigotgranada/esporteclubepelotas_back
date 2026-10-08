import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'USER',
  SOCIO = 'SOCIO',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum ShirtSize {
  P = 'P',
  M = 'M',
  G = 'G',
  GG = 'GG',
  XG = 'XG',
}

@Schema({ _id: false })
export class Phone {
  @Prop({ type: String, required: true })
  number: string;

  @Prop({ type: Boolean, default: false })
  isWhatsapp: boolean;

  @Prop({ type: Boolean, default: false })
  isPrimary: boolean;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;
}

export const PhoneSchema = SchemaFactory.createForClass(Phone);

@Schema({ _id: false })
export class Address {
  @Prop({ type: String, required: true })
  zipCode: string;

  @Prop({ type: String, required: true })
  street: string;

  @Prop({ type: String, required: true })
  number: string;

  @Prop({ type: String })
  complement: string;

  @Prop({ type: String, required: true })
  neighborhood: string;

  @Prop({ type: String, required: true })
  city: string;

  @Prop({ type: String, required: true })
  state: string;

  @Prop({ type: Boolean, default: false })
  isPrimary: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ _id: false })
export class Preferences {
  @Prop({ type: String, enum: ShirtSize })
  shirtSize?: ShirtSize;

  @Prop({ type: Boolean, default: true })
  receiveNewsletter: boolean;

  @Prop({ type: Boolean, default: false })
  receiveSms: boolean;
}

export const PreferencesSchema = SchemaFactory.createForClass(Preferences);

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  email: string;

  @Prop({ type: Boolean, default: false })
  emailVerified: boolean;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  cpf: string;

  @Prop({ type: Date, required: true })
  birthDate: Date;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: [PhoneSchema], required: true })
  phones: Phone[];

  @Prop({ type: [AddressSchema], required: true })
  addresses: Address[];

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role: Types.ObjectId;

  @Prop({ type: PreferencesSchema, default: () => ({ receiveNewsletter: true, receiveSms: false }) })
  preferences: Preferences;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockoutUntil?: Date;

  @Prop({ type: String })
  resetPasswordToken?: string;

  @Prop({ type: Date })
  resetPasswordExpires?: Date;

  @Prop({
    type: [{
      type: { type: String, enum: ['email', 'phone'], required: true },
      newValue: { type: String, required: true },
      code: { type: String, required: true },
      expiresAt: { type: Date, required: true }
    }],
    default: []
  })
  pendingChanges: Array<{
    type: 'email' | 'phone';
    newValue: string;
    code: string;
    expiresAt: Date;
  }>;

  @Prop({ type: Number, default: 1 })
  tokenVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

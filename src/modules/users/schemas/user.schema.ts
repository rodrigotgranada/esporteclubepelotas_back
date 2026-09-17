import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'USER',
  SOCIO = 'SOCIO',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
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

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, required: true, unique: true })
  cpf: string;

  @Prop({ type: Date, required: true })
  birthDate: Date;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: [PhoneSchema], required: true })
  phones: Phone[];

  @Prop({ type: [AddressSchema], required: true })
  addresses: Address[];

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: PreferencesSchema, default: () => ({ receiveNewsletter: true }) })
  preferences: Preferences;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

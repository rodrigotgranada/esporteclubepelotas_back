import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional, ValidateNested, IsBoolean, IsArray, IsEnum, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ShirtSize } from '../schemas/user.schema.js';

export class PhoneDto {
  @IsString()
  @IsNotEmpty()
  number: string;

  @IsBoolean()
  @IsOptional()
  isWhatsapp?: boolean;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsOptional()
  complement?: string;

  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class PreferencesDto {
  @IsEnum(ShirtSize)
  @IsOptional()
  shirtSize?: ShirtSize;

  @IsBoolean()
  @IsOptional()
  receiveNewsletter?: boolean;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}\-?\d{2}$/, { message: 'Invalid CPF format' })
  cpf: string;

  @IsNotEmpty()
  @Type(() => Date)
  birthDate: Date;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneDto)
  @IsNotEmpty()
  phones: PhoneDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @IsNotEmpty()
  addresses: AddressDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}

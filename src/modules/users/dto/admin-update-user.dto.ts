import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { UserStatus } from '../schemas/user.schema.js';

export class AdminUpdateUserDto extends PartialType(CreateUserDto) {
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

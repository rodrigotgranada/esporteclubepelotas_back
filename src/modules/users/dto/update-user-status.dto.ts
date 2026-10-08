import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../schemas/user.schema.js';

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'New status for the user', enum: UserStatus })
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status: UserStatus;
}

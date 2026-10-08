import { IsString, IsIn, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestChangeDto {
  @ApiProperty({ enum: ['email', 'phone'] })
  @IsIn(['email', 'phone'])
  type: 'email' | 'phone';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newValue: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  currentPassword: string;
}

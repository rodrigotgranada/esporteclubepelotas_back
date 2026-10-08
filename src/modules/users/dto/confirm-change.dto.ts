import { IsString, IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmChangeDto {
  @ApiProperty({ enum: ['email', 'phone'] })
  @IsIn(['email', 'phone'])
  type: 'email' | 'phone';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;
}

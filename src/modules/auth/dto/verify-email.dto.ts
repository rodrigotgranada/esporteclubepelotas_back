import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'The email of the user to verify' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The 6-digit confirmation code sent to the email' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

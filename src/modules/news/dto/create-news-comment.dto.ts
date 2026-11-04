import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNewsCommentDto {
  @ApiProperty({
    description: 'Conteúdo do comentário do torcedor',
    example: 'Vamos Pelotas! Que vitória maravilhosa na Boca do Lobo!',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'O comentário não pode estar vazio.' })
  @MinLength(1, { message: 'O comentário deve ter no mínimo 1 caractere.' })
  @MaxLength(1000, { message: 'O comentário deve ter no máximo 1000 caracteres.' })
  content: string;
}


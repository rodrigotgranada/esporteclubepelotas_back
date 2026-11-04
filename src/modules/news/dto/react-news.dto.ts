import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const VALID_REACTIONS = ['wolf', 'fire', 'clap', 'heart'] as const;
export type NewsReactionType = (typeof VALID_REACTIONS)[number];

export class ReactNewsDto {
  @ApiProperty({
    description: 'Tipo da reação',
    enum: VALID_REACTIONS,
    example: 'wolf',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_REACTIONS, {
    message: 'Reação inválida. Tipos permitidos: wolf, fire, clap, heart',
  })
  type: NewsReactionType;
}

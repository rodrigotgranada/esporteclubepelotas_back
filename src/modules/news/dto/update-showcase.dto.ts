import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsOptional } from 'class-validator';

export class UpdateShowcaseDto {
  @ApiPropertyOptional({
    description: 'ID da matéria no Slot 1 (Manchetão Principal) ou null para vazio',
    example: '6ae9b12e486b8c436b0c4057',
  })
  @IsMongoId({ message: 'O ID da matéria principal deve ser um ObjectId válido.' })
  @IsOptional()
  mainId?: string | null;

  @ApiPropertyOptional({
    description: 'Array de IDs das matérias nos Slots Secundários (máx 2)',
    example: ['6ae9b12f486b8c436b0c4059'],
  })
  @IsArray({ message: 'secondaryIds deve ser um array de IDs.' })
  @IsMongoId({ each: true, message: 'Cada item de secondaryIds deve ser um ObjectId válido.' })
  @IsOptional()
  secondaryIds?: string[];
}


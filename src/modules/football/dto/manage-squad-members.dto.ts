import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SquadMemberRole, SquadSector } from '../schemas/squad.schema.js';

export class SquadMemberDto {
  @ApiProperty({ description: 'ID do Atleta cadastrado' })
  @IsString()
  @IsNotEmpty({ message: 'O ID do atleta é obrigatório.' })
  athleteId: string;

  @ApiProperty({ description: 'Número da camisa nesta temporada', example: 9 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  jerseyNumber: number;

  @ApiProperty({ enum: SquadSector, description: 'Setor de atuação no elenco' })
  @IsEnum(SquadSector)
  sector: SquadSector;

  @ApiPropertyOptional({ enum: SquadMemberRole, default: SquadMemberRole.STARTER })
  @IsEnum(SquadMemberRole)
  @IsOptional()
  role?: SquadMemberRole;

  @ApiPropertyOptional({ description: 'Ordem de exibição visual', default: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  order?: number;
}

export class SetSquadMembersDto {
  @ApiProperty({ type: [SquadMemberDto], description: 'Lista completa de membros do elenco' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SquadMemberDto)
  members: SquadMemberDto[];
}


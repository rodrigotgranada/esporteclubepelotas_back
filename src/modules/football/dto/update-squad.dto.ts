import { PartialType } from '@nestjs/swagger';
import { CreateSquadDto } from './create-squad.dto.js';

export class UpdateSquadDto extends PartialType(CreateSquadDto) {}


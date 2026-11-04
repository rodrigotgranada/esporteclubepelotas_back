import { PartialType } from '@nestjs/swagger';
import { CreateIdolDto } from './create-idol.dto.js';

export class UpdateIdolDto extends PartialType(CreateIdolDto) {}


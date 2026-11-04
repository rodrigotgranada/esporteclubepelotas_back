import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AthletesAdminService } from './athletes-admin.service.js';
import { CreateAthleteDto } from './dto/create-athlete.dto.js';
import { UpdateAthleteDto } from './dto/update-athlete.dto.js';
import { QueryAthletesDto } from './dto/query-athletes.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Futebol: Atletas (Gestão Administrativa)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('football.manage')
@Controller('athletes/admin')
export class AthletesAdminController {
  constructor(private readonly athletesAdminService: AthletesAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Listar atletas para o painel de administração' })
  async findAll(@Query() query: QueryAthletesDto) {
    return this.athletesAdminService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter atleta por ID para edição' })
  async findById(@Param('id') id: string) {
    return this.athletesAdminService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo atleta no banco permanente' })
  async create(@Body() dto: CreateAthleteDto, @CurrentUser() user: any) {
    return this.athletesAdminService.create(dto, user?.id || user?._id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados cadastrais do atleta' })
  async update(@Param('id') id: string, @Body() dto: UpdateAthleteDto) {
    return this.athletesAdminService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Inativar atleta (Soft Delete)' })
  async remove(@Param('id') id: string) {
    return this.athletesAdminService.remove(id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Fazer upload da foto oficial do atleta' })
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.athletesAdminService.uploadPhoto(id, file);
  }
}

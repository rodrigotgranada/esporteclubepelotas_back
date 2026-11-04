import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SquadsAdminService } from './squads-admin.service.js';
import { CreateSquadDto } from './dto/create-squad.dto.js';
import { UpdateSquadDto } from './dto/update-squad.dto.js';
import { QuerySquadsDto } from './dto/query-squads.dto.js';
import { SetSquadMembersDto, SquadMemberDto } from './dto/manage-squad-members.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Futebol: Elencos (Gestão Administrativa)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('football.manage')
@Controller('squads/admin')
export class SquadsAdminController {
  constructor(private readonly squadsAdminService: SquadsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Listar elencos cadastrados com filtros e paginação' })
  async findAll(@Query() query: QuerySquadsDto) {
    return this.squadsAdminService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter elenco por ID com atletas populados' })
  async findById(@Param('id') id: string) {
    return this.squadsAdminService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova temporada/elenco' })
  async create(@Body() dto: CreateSquadDto, @CurrentUser() user: any) {
    return this.squadsAdminService.create(dto, user?.id || user?._id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar informações gerais do elenco' })
  async update(@Param('id') id: string, @Body() dto: UpdateSquadDto) {
    return this.squadsAdminService.update(id, dto);
  }

  @Put(':id/members')
  @ApiOperation({ summary: 'Definir lista completa de membros do elenco em lote' })
  async setMembers(@Param('id') id: string, @Body() dto: SetSquadMembersDto) {
    return this.squadsAdminService.setMembers(id, dto);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Adicionar ou atualizar um membro específico no elenco' })
  async addOrUpdateMember(@Param('id') id: string, @Body() memberDto: SquadMemberDto) {
    return this.squadsAdminService.addOrUpdateMember(id, memberDto);
  }

  @Delete(':id/members/:athleteId')
  @ApiOperation({ summary: 'Remover atleta do elenco' })
  async removeMember(
    @Param('id') id: string,
    @Param('athleteId') athleteId: string,
  ) {
    return this.squadsAdminService.removeMember(id, athleteId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Inativar elenco (Soft Delete)' })
  async remove(@Param('id') id: string) {
    return this.squadsAdminService.remove(id);
  }

  @Post(':id/cover')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Fazer upload da foto oficial de capa do elenco' })
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.squadsAdminService.uploadCover(id, file);
  }
}

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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { IdolsAdminService } from './idols-admin.service.js';
import { CreateIdolDto } from './dto/create-idol.dto.js';
import { UpdateIdolDto } from './dto/update-idol.dto.js';
import { QueryIdolsDto } from './dto/query-idols.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Ídolos (Gestão Administrativa)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('idols.manage')
@Controller('idols/admin')
export class IdolsAdminController {
  constructor(private readonly idolsAdminService: IdolsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ídolos para o painel de administração' })
  async findAll(@Query() query: QueryIdolsDto) {
    return this.idolsAdminService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um ídolo para edição por ID' })
  async findById(@Param('id') id: string) {
    return this.idolsAdminService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar um novo ídolo no Memorial' })
  async create(@Body() createIdolDto: CreateIdolDto, @CurrentUser() user: any) {
    const userId = user?.id || user?._id || user?.sub;
    return this.idolsAdminService.create(createIdolDto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados de um ídolo existente' })
  async update(
    @Param('id') id: string,
    @Body() updateIdolDto: UpdateIdolDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id || user?._id || user?.sub;
    return this.idolsAdminService.update(id, updateIdolDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover um ídolo do Memorial (soft delete)' })
  async delete(@Param('id') id: string) {
    return this.idolsAdminService.softDelete(id);
  }

  @Post(':id/photo')
  @ApiOperation({ summary: 'Upload da foto principal do ídolo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file: any) {
    return this.idolsAdminService.uploadPhoto(id, file);
  }

  @Post(':id/gallery')
  @ApiOperation({ summary: 'Upload de fotos para a galeria histórica do ídolo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('gallery', 10))
  async uploadGallery(@Param('id') id: string, @UploadedFiles() files: any[]) {
    return this.idolsAdminService.uploadGallery(id, files);
  }
}


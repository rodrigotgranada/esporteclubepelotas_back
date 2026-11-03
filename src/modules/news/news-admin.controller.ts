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
import { NewsAdminService } from './news-admin.service.js';
import { CreateNewsDto } from './dto/create-news.dto.js';
import { UpdateNewsDto } from './dto/update-news.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { QueryNewsDto } from './dto/query-news.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('News (Administração / Editor)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('news.manage')
@Controller('news/admin')
export class NewsAdminController {
  constructor(private readonly newsAdminService: NewsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as matérias para gestão (inclui rascunhos e agendadas)' })
  async adminFindAll(@Query() query: QueryNewsDto) {
    return this.newsAdminService.adminFindAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar todas as categorias para seleção no editor' })
  async adminFindAllCategories() {
    return this.newsAdminService.adminFindAllCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Criar uma nova categoria in-line diretamente pelo editor' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.newsAdminService.createCategory(createCategoryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter dados de uma matéria para edição por ID' })
  async adminFindById(@Param('id') id: string) {
    return this.newsAdminService.adminFindById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar uma nova matéria (rascunho ou publicada)' })
  async create(@Body() createNewsDto: CreateNewsDto, @CurrentUser() user: any) {
    const authorId = user?.id || user?._id || user?.sub;
    return this.newsAdminService.create(createNewsDto, authorId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma matéria existente' })
  async update(@Param('id') id: string, @Body() updateNewsDto: UpdateNewsDto) {
    return this.newsAdminService.update(id, updateNewsDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir uma matéria (soft-delete)' })
  async softDelete(@Param('id') id: string) {
    return this.newsAdminService.softDelete(id);
  }

  @Post(':id/cover')
  @ApiOperation({ summary: 'Upload da imagem de capa da matéria (Storage: news/{id})' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('cover'))
  async uploadCover(@Param('id') id: string, @UploadedFile() file: any) {
    return this.newsAdminService.uploadCover(id, file);
  }

  @Post(':id/gallery')
  @ApiOperation({ summary: 'Upload de múltiplas fotos para a galeria da matéria' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('gallery', 10))
  async uploadGallery(@Param('id') id: string, @UploadedFiles() files: any[]) {
    return this.newsAdminService.uploadGallery(id, files);
  }
}


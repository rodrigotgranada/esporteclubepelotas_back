import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsService } from './news.service.js';
import { QueryNewsDto } from './dto/query-news.dto.js';
import { ReactNewsDto } from './dto/react-news.dto.js';
import { CreateNewsCommentDto } from './dto/create-news-comment.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('News (Público)')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar matérias públicas com paginação e filtros' })
  async findAll(@Query() query: QueryNewsDto) {
    return this.newsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Obter matérias em destaque para carrossel ou capa' })
  async findFeatured(@Query('limit') limit?: number) {
    return this.newsService.findFeatured(limit ? Number(limit) : 4);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias públicas ativas' })
  async findAllCategories() {
    return this.newsService.findAllCategories();
  }

  @Get(':slug/prev-next')
  @ApiOperation({ summary: 'Obter matéria anterior e próxima cronológica' })
  async getPrevNext(@Param('slug') slug: string) {
    return this.newsService.getPrevNext(slug);
  }

  @Get(':slug/my-reaction')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter a reação do usuário logado na matéria' })
  async getMyReaction(@Param('slug') slug: string, @CurrentUser() user: any) {
    const userId = user?.id || user?._id || user?.sub;
    return this.newsService.getUserReaction(slug, userId);
  }

  @Post(':slug/reactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reagir a uma matéria com reação áureo-cerúlea (apenas usuários logados e ativos)' })
  async reactToArticle(
    @Param('slug') slug: string,
    @Body() dto: ReactNewsDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id || user?._id || user?.sub;
    return this.newsService.reactToArticle(slug, userId, dto.type);
  }

  @Get(':slug/comments')
  @ApiOperation({ summary: 'Listar comentários públicos de uma matéria com paginação' })
  async getComments(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.newsService.getComments(slug, page, limit);
  }

  @Post(':slug/comments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Adicionar comentário em uma matéria (apenas usuários autenticados e ativos)' })
  async addComment(
    @Param('slug') slug: string,
    @Body() dto: CreateNewsCommentDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id || user?._id || user?.sub;
    return this.newsService.addComment(slug, userId, dto.content);
  }

  @Delete('comments/:commentId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remover um comentário (próprio autor ou moderador)' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id || user?._id || user?.sub;
    const userRole = user?.role || 'User';
    return this.newsService.deleteComment(commentId, userId, userRole);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obter detalhes de uma matéria pública por slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.newsService.findBySlug(slug);
  }
}

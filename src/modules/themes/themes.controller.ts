import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ThemesService } from './themes.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Theme } from './schemas/theme.schema.js';

@ApiTags('Themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active theme (Public)' })
  async getActiveTheme() {
    return this.themesService.getActiveTheme();
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.view', 'settings.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all themes (Admin)' })
  async findAll() {
    return this.themesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new theme (Admin)' })
  async create(@Body() createData: Partial<Theme>) {
    return this.themesService.create(createData);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a theme (Admin)' })
  async update(@Param('id') id: string, @Body() updateData: Partial<Theme>) {
    return this.themesService.update(id, updateData);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate a theme (Admin)' })
  async activate(@Param('id') id: string) {
    await this.themesService.activate(id);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a theme (Admin)' })
  async remove(@Param('id') id: string) {
    await this.themesService.remove(id);
    return { success: true };
  }
}

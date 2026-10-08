import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Create a new role' })
  create(@Body() createRoleDto: { name: string; label?: string; description?: string; permissions?: string[] }) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @Permissions('roles.manage', 'users.manage') // Users manage needs to list roles for select
  @ApiOperation({ summary: 'List all roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('roles.manage')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('roles.manage')
  update(@Param('id') id: string, @Body() updateRoleDto: { name?: string; label?: string; description?: string; permissions?: string[] }) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Permissions('roles.manage')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}

import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SystemModulesService } from './system-modules.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('System Modules')
@ApiBearerAuth()
@Controller('admin/modules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemModulesController {
  constructor(private readonly modulesService: SystemModulesService) {}

  @Get()
  @Permissions('modules.manage') // Or any permission if we want users to know what's active, but admin/modules is for manage
  @ApiOperation({ summary: 'List all system modules' })
  findAll() {
    return this.modulesService.findAll();
  }

  @Patch(':id/status')
  @Permissions('modules.manage')
  @ApiOperation({ summary: 'Enable or disable a module' })
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.modulesService.updateStatus(id, isActive);
  }
}

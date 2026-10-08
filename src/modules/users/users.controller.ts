import { Controller, Post, Body, HttpCode, HttpStatus, Put, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException, ConflictException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { CheckAvailabilityDto } from './dto/check-availability.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions/permissions.guard.js';
import { Permissions } from '../../common/decorators/permissions/permissions.decorator.js';
import { UserRole, UserStatus } from './schemas/user.schema.js';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { GetUsersDto } from './dto/get-users.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';
import { Get, Query, Param, Patch, Delete } from '@nestjs/common';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON stringified CreateUserDto',
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed.' })
  @ApiResponse({ status: 409, description: 'Conflict - Email or CPF already in use.' })
  @UseInterceptors(FileInterceptor('avatar'))
  async register(
    @Body('data') dataStr: string,
    @UploadedFile() file?: any,
  ) {
    if (!dataStr) {
      throw new BadRequestException('Data payload is missing');
    }
    
    let createUserDto: CreateUserDto;
    try {
      const parsed = JSON.parse(dataStr);
      createUserDto = plainToInstance(CreateUserDto, parsed);
    } catch (err) {
      throw new BadRequestException('Invalid JSON payload');
    }

    const errors = await validate(createUserDto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    // Passamos o DTO e o File para o Service
    return this.usersService.createWithAvatar(createUserDto, file);
  }

  @Post('admin/create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user by Admin directly as ACTIVE' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'JSON stringified CreateUserDto (includes role)' },
        avatar: { type: 'string', format: 'binary', description: 'Avatar image file (optional)' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  async adminCreate(
    @Body('data') dataStr: string,
    @UploadedFile() file?: any,
  ) {
    if (!dataStr) {
      throw new BadRequestException('Data payload is missing');
    }
    
    let createUserDto: CreateUserDto;
    try {
      const parsed = JSON.parse(dataStr);
      createUserDto = plainToInstance(CreateUserDto, parsed);
    } catch (err) {
      throw new BadRequestException('Invalid JSON payload');
    }

    const errors = await validate(createUserDto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.usersService.adminCreateWithAvatar(createUserDto, file);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.view', 'users.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users (Admin/Owner)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll(page, limit, search, role, status);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.edit', 'users.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user directly by Admin' })
  @ApiParam({ name: 'id', required: true, type: String })
  async adminUpdate(@Param('id') id: string, @Body() body: AdminUpdateUserDto, @Req() req: any) {
    return this.usersService.adminUpdate(id, body, req.user);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.edit', 'users.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiParam({ name: 'id', required: true, type: String })
  async updateStatus(@Param('id') id: string, @Body() body: UpdateUserStatusDto, @Req() req: any) {
    return this.usersService.updateStatus(id, body.status, req.user);
  }

  @Patch('admin/:id/role')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.edit', 'users.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user role (Admin/Owner)' })
  @ApiParam({ name: 'id', required: true, type: String })
  async updateRole(@Param('id') id: string, @Body() body: UpdateUserRoleDto, @Req() req: any) {
    return this.usersService.updateRole(id, body.role, req.user);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.delete', 'users.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete user (Admin/Owner)' })
  @ApiParam({ name: 'id', required: true, type: String })
  async adminSoftDelete(@Param('id') id: string, @Req() req: any) {
    await this.usersService.adminSoftDelete(id, req.user);
    return { success: true };
  }

  @Post('admin/:id/resend-verification')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.edit', 'users.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend email verification (Admin/Owner)' })
  @ApiParam({ name: 'id', required: true, type: String })
  async adminResendVerification(@Param('id') id: string, @Req() req: any) {
    await this.usersService.adminResendVerification(id, req.user);
    return { success: true };
  }

  @Post('admin/:id/force-password-reset')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.edit', 'users.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Force password reset email (Admin/Owner)' })
  @ApiParam({ name: 'id', required: true, type: String })
  async adminForcePasswordReset(@Param('id') id: string, @Req() req: any) {
    await this.usersService.adminForcePasswordReset(id, req.user);
    return { success: true };
  }
}

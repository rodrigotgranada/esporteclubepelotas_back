import { Controller, Post, Body, HttpCode, HttpStatus, Put, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException, ConflictException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { CheckAvailabilityDto } from './dto/check-availability.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Put('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload or update the user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: any, @Req() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.usersService.updateAvatar(userId, file);
  }

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if email or CPF is available' })
  async checkAvailability(@Body() body: CheckAvailabilityDto) {
    const isAvailable = await this.usersService.checkAvailability(body.type, body.value);
    if (!isAvailable) {
      throw new ConflictException(`${body.type === 'email' ? 'Email' : 'CPF'} already in use`);
    }
    return { available: true };
  }
}

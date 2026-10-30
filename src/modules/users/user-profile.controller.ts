import { Controller, Post, Patch, Put, Delete, Body, Req, UseGuards, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserProfileService } from './user-profile.service.js';
import { UsersService } from './users.service.js';
import { UpdateMeDto } from './dto/update-me.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';
import { RequestChangeDto } from './dto/request-change.dto.js';
import { ConfirmChangeDto } from './dto/confirm-change.dto.js';
import { ConfirmFirebasePhoneDto } from './dto/confirm-firebase-phone.dto.js';

@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly usersService: UsersService,
  ) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile' })
  async updateMe(@Body() updateMeDto: UpdateMeDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.updateMe(userId, updateMeDto);
  }

  @Put('me/avatar')
  @ApiOperation({ summary: 'Update my avatar (PUT)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(AnyFilesInterceptor())
  async updateAvatarPut(@UploadedFiles() files: any[], @Req() req: any) {
    const file = files?.[0];
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.updateAvatar(userId, file);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Update my avatar (POST)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(AnyFilesInterceptor())
  async updateAvatarPost(@UploadedFiles() files: any[], @Req() req: any) {
    const file = files?.[0];
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.updateAvatar(userId, file);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Delete my avatar' })
  async deleteAvatar(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.updateMe(userId, { avatarUrl: '' });
  }

  @Delete('me')
  @ApiOperation({ summary: 'Deactivate my account' })
  async deactivateMe(@Body('password') password: string, @Req() req: any) {
    if (!password) throw new BadRequestException('A senha é obrigatória para excluir a conta');
    const userId = req.user?.id || req.user?.userId;
    await this.usersService.deactivateMe(userId, password);
    return { success: true };
  }

  @Patch('profile/password')
  @ApiOperation({ summary: 'Update password' })
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    await this.userProfileService.updatePassword(userId, updatePasswordDto.currentPassword, updatePasswordDto.newPassword);
    return { success: true };
  }

  @Post('profile/request-change')
  @ApiOperation({ summary: 'Request email or phone change' })
  async requestChange(@Body() dto: RequestChangeDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.userProfileService.requestChange(userId, dto.type, dto.newValue, dto.currentPassword);
  }

  @Post('profile/confirm-change')
  @ApiOperation({ summary: 'Confirm email or phone change' })
  async confirmChange(@Body() dto: ConfirmChangeDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.userProfileService.confirmChange(userId, dto.type, dto.code);
  }

  @Post('profile/confirm-firebase-phone')
  @ApiOperation({ summary: 'Confirm phone change via Firebase' })
  async confirmFirebasePhone(@Body() dto: ConfirmFirebasePhoneDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.userProfileService.confirmFirebasePhone(userId, dto.idToken, dto.currentPassword);
  }
}

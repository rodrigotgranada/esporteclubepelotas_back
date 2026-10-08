import { Controller, Post, Patch, Put, Delete, Body, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
    return this.usersService.updateMe(req.user.id, updateMeDto);
  }

  @Put('me/avatar')
  @ApiOperation({ summary: 'Update my avatar' })
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
  async updateAvatar(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    return this.usersService.updateAvatar(req.user.id, file);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Deactivate my account' })
  async deactivateMe(@Body('password') password: string, @Req() req: any) {
    if (!password) throw new BadRequestException('A senha é obrigatória para excluir a conta');
    await this.usersService.deactivateMe(req.user.id, password);
    return { success: true };
  }

  @Patch('profile/password')
  @ApiOperation({ summary: 'Update password' })
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto, @Req() req: any) {
    await this.userProfileService.updatePassword(req.user.id, updatePasswordDto.currentPassword, updatePasswordDto.newPassword);
    return { success: true };
  }

  @Post('profile/request-change')
  @ApiOperation({ summary: 'Request email or phone change' })
  async requestChange(@Body() dto: RequestChangeDto, @Req() req: any) {
    return this.userProfileService.requestChange(req.user.id, dto.type, dto.newValue, dto.currentPassword);
  }

  @Post('profile/confirm-change')
  @ApiOperation({ summary: 'Confirm email or phone change' })
  async confirmChange(@Body() dto: ConfirmChangeDto, @Req() req: any) {
    return this.userProfileService.confirmChange(req.user.id, dto.type, dto.code);
  }

  @Post('profile/confirm-firebase-phone')
  @ApiOperation({ summary: 'Confirm phone change via Firebase' })
  async confirmFirebasePhone(@Body() dto: ConfirmFirebasePhoneDto, @Req() req: any) {
    return this.userProfileService.confirmFirebasePhone(req.user.id, dto.idToken, dto.currentPassword);
  }
}

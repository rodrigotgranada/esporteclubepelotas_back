import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema.js';
import { VerificationCode, VerificationCodeSchema } from './schemas/verification-code.schema.js';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema.js';
import { RoleSchema } from '../roles/schemas/role.schema.js';
import { UsersService } from './users.service.js';
import { UserProfileService } from './user-profile.service.js';
import { UserProfileController } from './user-profile.controller.js';
import { UsersController } from './users.controller.js';
import { StorageModule } from '../../common/providers/storage/storage.module.js';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: VerificationCode.name, schema: VerificationCodeSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: 'Role', schema: RoleSchema }
    ]),
    StorageModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [UsersController, UserProfileController],
  providers: [UsersService, UserProfileService],
  exports: [UsersService, UserProfileService, MongooseModule],
})
export class UsersModule {}

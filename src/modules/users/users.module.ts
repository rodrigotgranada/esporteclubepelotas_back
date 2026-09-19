import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema.js';
import { VerificationCode, VerificationCodeSchema } from './schemas/verification-code.schema.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { StorageModule } from '../../common/providers/storage/storage.module.js';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: VerificationCode.name, schema: VerificationCodeSchema }
    ]),
    StorageModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MailModule } from './common/providers/mail/mail.module.js';
import { StorageModule } from './common/providers/storage/storage.module.js';
import { SmsModule } from './common/providers/sms/sms.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { SystemModulesModule } from './modules/system-modules/system-modules.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { ThemesModule } from './modules/themes/themes.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname,req,res,responseTime',
              },
            }
          : undefined,
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MailModule,
    StorageModule,
    SmsModule,
    UsersModule,
    AuthModule,
    UploadsModule,
    SystemModulesModule,
    RolesModule,
    ThemesModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

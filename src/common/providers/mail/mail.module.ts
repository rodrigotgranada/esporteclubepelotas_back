import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER_TOKEN } from './mail.interface.js';
import { NodemailerMailProvider } from './nodemailer.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        return new NodemailerMailProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MAIL_PROVIDER_TOKEN],
})
export class MailModule {}

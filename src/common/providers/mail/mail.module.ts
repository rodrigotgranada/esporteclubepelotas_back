import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER_TOKEN } from './mail.interface.js';
import { ResendMailProvider } from './resend.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        // Futuramente pode ser lido de MAIL_PROVIDER=aws_ses | resend
        return new ResendMailProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MAIL_PROVIDER_TOKEN],
})
export class MailModule {}

import { Module, Global } from '@nestjs/common';
import { SMS_PROVIDER_TOKEN } from './sms.interface.js';
import { WhatsappMetaProvider } from './implementations/whatsapp-meta.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: SMS_PROVIDER_TOKEN,
      useClass: WhatsappMetaProvider,
    },
  ],
  exports: [SMS_PROVIDER_TOKEN],
})
export class SmsModule {}

import { Injectable, Logger } from '@nestjs/common';
import { ISmsProvider } from '../sms.interface.js';

@Injectable()
export class WhatsappMetaProvider implements ISmsProvider {
  private readonly logger = new Logger(WhatsappMetaProvider.name);

  async sendSms(to: string, message: string): Promise<void> {
    // TODO: Implement actual WhatsApp Cloud API (Meta) HTTP call here
    // Ex: axios.post('https://graph.facebook.com/vX.0/PHONE_ID/messages', ...)
    
    this.logger.warn(`[Mock SMS/WhatsApp] Mensagem não enviada de verdade.`);
    this.logger.warn(`[Mock SMS/WhatsApp] Para: ${to}`);
    this.logger.warn(`[Mock SMS/WhatsApp] Texto: ${message}`);
  }
}

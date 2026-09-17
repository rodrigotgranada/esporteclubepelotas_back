import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { IMailProvider } from './mail.interface.js';

@Injectable()
export class ResendMailProvider implements IMailProvider {
  private resend: Resend;
  private readonly logger = new Logger(ResendMailProvider.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    
    if (apiKey && apiKey !== 'mock-resend-key') {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Serviço de E-mail Conectado (Resend)');
    } else {
      this.logger.warn('⚠️ Credenciais Resend não encontradas no .env. Operando em modo Mock.');
      // Instancia com chave fake apenas para evitar quebrar a app, mas o sendMail falhará no mock
      this.resend = new Resend('re_mock');
    }
  }

  async sendMail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      await this.resend.emails.send({
        from: 'Esporte Clube Pelotas <no-reply@ecpelotas.com.br>',
        to,
        subject,
        html: body,
      });
      this.logger.log(`E-mail enviado via Resend para ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail via Resend: ${(error as Error).message}`);
      return false;
    }
  }
}

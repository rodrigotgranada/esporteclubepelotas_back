import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IMailProvider } from './mail.interface.js';

@Injectable()
export class NodemailerMailProvider implements IMailProvider {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(NodemailerMailProvider.name);

  constructor(private configService: ConfigService) {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (user && pass && user !== 'your-email@gmail.com') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('✅ Serviço de E-mail Conectado (Nodemailer/Gmail)');
    } else {
      this.logger.warn('⚠️ Credenciais Gmail (SMTP_USER/SMTP_PASS) não encontradas no .env. E-mails não serão enviados de verdade.');
      // Cria um transportador fake (mock)
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
      });
    }
  }

  async sendMail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      const fromEmail = this.configService.get<string>('SMTP_USER') || 'no-reply@ecpelotas.com.br';
      
      const info = await this.transporter.sendMail({
        from: `"Esporte Clube Pelotas" <${fromEmail}>`,
        to,
        subject,
        html: body,
      });

      this.logger.log(`E-mail enviado via Gmail para ${to} (MessageId: ${info.messageId})`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail via Gmail: ${(error as Error).message}`);
      return false;
    }
  }
}

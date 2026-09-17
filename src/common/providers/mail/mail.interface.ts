export const MAIL_PROVIDER_TOKEN = 'IMailProvider';

export interface IMailProvider {
  sendMail(to: string, subject: string, body: string): Promise<boolean>;
}

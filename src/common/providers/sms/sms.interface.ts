export const SMS_PROVIDER_TOKEN = 'ISmsProvider';

export interface ISmsProvider {
  /**
   * Sends a message to a mobile number.
   * @param to The recipient's mobile number (including country code)
   * @param message The body of the message
   */
  sendSms(to: string, message: string): Promise<void>;
}

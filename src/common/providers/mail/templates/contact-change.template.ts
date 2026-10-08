export function getChangeEmailTemplate(code: string, newEmail: string, expiresAt: Date): string {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(expiresAt);

  return `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #0b1a30; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
        
        <div style="background-color: #0b1a30; text-align: center; padding: 30px 20px; border-bottom: 4px solid #eab308;">
          <h1 style="color: #eab308; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">E.C. Pelotas</h1>
        </div>
        
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #0b1a30; margin-top: 0; font-size: 24px;">Confirmação de Alteração de E-mail</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Foi solicitada a alteração do seu e-mail de acesso para:
          </p>
          <p style="color: #0b1a30; font-size: 18px; font-weight: bold; margin-bottom: 30px;">${newEmail}</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Utilize o código abaixo para confirmar esta alteração. Se não foi você quem solicitou, ignore este e-mail — sua conta permanece segura.
          </p>
          
          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin: 0 auto; max-width: 300px;">
            <span style="font-size: 40px; font-weight: bold; color: #0b1a30; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            <strong>Válido até:</strong> ${formattedDate.replace(',', ' às')}
          </p>
        </div>
        
        <div style="background-color: #f1f5f9; text-align: center; padding: 20px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Esporte Clube Pelotas. Todos os direitos reservados.</p>
          <p style="margin: 5px 0 0 0;">Este é um e-mail automático, por favor não responda.</p>
        </div>
        
      </div>
    </div>
  `;
}

export function getChangePhoneTemplate(code: string, newPhone: string, expiresAt: Date): string {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(expiresAt);

  return `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #0b1a30; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
        
        <div style="background-color: #0b1a30; text-align: center; padding: 30px 20px; border-bottom: 4px solid #eab308;">
          <h1 style="color: #eab308; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">E.C. Pelotas</h1>
        </div>
        
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #0b1a30; margin-top: 0; font-size: 24px;">Confirmação de Alteração de Celular</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Foi solicitada a alteração do seu número de celular para:
          </p>
          <p style="color: #0b1a30; font-size: 18px; font-weight: bold; margin-bottom: 30px;">${newPhone}</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Como ainda não possuímos envio de SMS, enviamos este código para o seu e-mail cadastrado. Utilize-o para confirmar a alteração. Se não foi você quem solicitou, ignore este e-mail.
          </p>
          
          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin: 0 auto; max-width: 300px;">
            <span style="font-size: 40px; font-weight: bold; color: #0b1a30; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            <strong>Válido até:</strong> ${formattedDate.replace(',', ' às')}
          </p>
        </div>
        
        <div style="background-color: #f1f5f9; text-align: center; padding: 20px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Esporte Clube Pelotas. Todos os direitos reservados.</p>
          <p style="margin: 5px 0 0 0;">Este é um e-mail automático, por favor não responda.</p>
        </div>
        
      </div>
    </div>
  `;
}

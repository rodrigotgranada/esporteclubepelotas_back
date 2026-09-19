export function getResetPasswordEmailTemplate(frontendUrl: string, token: string, expiresAt: Date): string {
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

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
          <h2 style="color: #0b1a30; margin-top: 0; font-size: 24px;">Redefinição de Senha</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez essa solicitação, pode ignorar este e-mail em segurança.
          </p>
          
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #eab308; color: #0b1a30; font-weight: bold; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-size: 18px; box-shadow: 0 4px 6px rgba(234,179,8,0.3);">
              REDEFINIR MINHA SENHA
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Este link é válido até <strong>${formattedDate.replace(',', ' às')}</strong>.<br/>
            Por motivos de segurança, não compartilhe este link com ninguém.
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

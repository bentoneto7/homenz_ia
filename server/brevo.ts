/**
 * Brevo (ex-Sendinblue) Email Helper
 * Handles all transactional email dispatches for the Homenz IA platform.
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const FROM_EMAIL = "noreply@homenzadvanced.com";
const FROM_NAME = "Homenz IA";

interface EmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: { email: string; name?: string };
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: payload.to,
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        textContent: payload.textContent,
        replyTo: payload.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Brevo] Failed to send email:", error);
      return false;
    }

    console.log(`[Brevo] Email sent to ${payload.to.map(t => t.email).join(", ")}: ${payload.subject}`);
    return true;
  } catch (err) {
    console.error("[Brevo] Error sending email:", err);
    return false;
  }
}

// ─── Email Templates ────────────────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f7fa;
  margin: 0;
  padding: 0;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 12px;
  padding: 40px;
  max-width: 560px;
  margin: 40px auto;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
`;

const logoHtml = `
  <div style="text-align:center;margin-bottom:32px;">
    <span style="font-size:24px;font-weight:800;color:#0d9488;letter-spacing:-0.5px;">HOMENZ <span style="color:#1e293b;">IA</span></span>
  </div>
`;

const footerHtml = `
  <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
    <p style="margin:0;">Homenz IA — Plataforma de Captação Capilar</p>
    <p style="margin:4px 0 0;">homenzadvanced.com</p>
  </div>
`;

function wrapTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        ${logoHtml}
        ${content}
        ${footerHtml}
      </div>
    </body>
    </html>
  `;
}

// ─── 1. Boas-vindas ao Franqueado ────────────────────────────────────────────

export async function sendWelcomeFranchisee(params: {
  email: string;
  name: string;
  clinicName: string;
  trialDays?: number;
}) {
  const days = params.trialDays ?? 15;
  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject: `Bem-vindo à Homenz IA, ${params.name.split(" ")[0]}! 🚀`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Sua clínica está pronta para decolar.</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Olá, <strong>${params.name.split(" ")[0]}</strong>! A <strong>${params.clinicName}</strong> foi cadastrada com sucesso na Homenz IA.
        Você tem <strong>${days} dias grátis</strong> para explorar tudo — sem cartão de crédito.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">Próximos passos recomendados:</p>
        <ol style="margin:8px 0 0;padding-left:20px;color:#166534;font-size:14px;line-height:1.8;">
          <li>Cadastre seus vendedores no painel</li>
          <li>Crie sua primeira landing page</li>
          <li>Configure seu pixel do Meta</li>
          <li>Suba seu primeiro anúncio e veja os leads chegando</li>
        </ol>
      </div>
      <div style="text-align:center;">
        <a href="https://homenzadvanced.com/franqueado" style="display:inline-block;background:#0d9488;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Acessar meu painel →
        </a>
      </div>
    `),
  });
}

// ─── 2. Convite de Vendedor ───────────────────────────────────────────────────

export async function sendSellerInvite(params: {
  email: string;
  name: string;
  clinicName: string;
  inviteLink: string;
}) {
  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject: `Você foi convidado para a equipe ${params.clinicName} — Homenz IA`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Você recebeu um convite!</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Olá, <strong>${params.name.split(" ")[0]}</strong>! Você foi convidado para fazer parte da equipe de vendas da <strong>${params.clinicName}</strong> na plataforma Homenz IA.
      </p>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Clique no botão abaixo para ativar sua conta e começar a receber leads.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${params.inviteLink}" style="display:inline-block;background:#0d9488;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Ativar minha conta →
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">
        Este link expira em 48 horas. Se você não esperava este convite, ignore este email.
      </p>
    `),
  });
}

// ─── 3. Trial Expirando (3 dias antes) ───────────────────────────────────────

export async function sendTrialExpiringSoon(params: {
  email: string;
  name: string;
  clinicName: string;
  daysLeft: number;
  checkoutUrl: string;
}) {
  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject: `⏰ Seu trial expira em ${params.daysLeft} dia${params.daysLeft > 1 ? "s" : ""} — Homenz IA`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Seu período gratuito está acabando.</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Olá, <strong>${params.name.split(" ")[0]}</strong>! O trial da <strong>${params.clinicName}</strong> expira em <strong>${params.daysLeft} dia${params.daysLeft > 1 ? "s" : ""}</strong>.
        Para não perder o acesso ao painel, leads e landing pages, assine agora.
      </p>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#92400e;font-size:14px;">
          ⚠️ Após o vencimento, o painel será bloqueado e as landing pages ficarão inativas.
        </p>
      </div>
      <div style="text-align:center;">
        <a href="${params.checkoutUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Assinar agora e continuar →
        </a>
      </div>
    `),
  });
}

// ─── 4. Confirmação de Pagamento / Upgrade ────────────────────────────────────

export async function sendPaymentConfirmation(params: {
  email: string;
  name: string;
  clinicName: string;
  planName: string;
}) {
  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject: `✅ Pagamento confirmado — Bem-vindo ao plano ${params.planName}!`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Pagamento confirmado! 🎉</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Olá, <strong>${params.name.split(" ")[0]}</strong>! O pagamento da <strong>${params.clinicName}</strong> foi processado com sucesso.
        Seu plano <strong>${params.planName}</strong> está ativo agora.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">O que está desbloqueado:</p>
        <ul style="margin:8px 0 0;padding-left:20px;color:#166534;font-size:14px;line-height:1.8;">
          <li>Landing pages ilimitadas</li>
          <li>Leads ilimitados</li>
          <li>Pixel + Conversions API por LP</li>
          <li>Painel completo sem restrições</li>
        </ul>
      </div>
      <div style="text-align:center;">
        <a href="https://homenzadvanced.com/franqueado" style="display:inline-block;background:#0d9488;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Acessar meu painel →
        </a>
      </div>
    `),
  });
}

// ─── 5. Novo Lead para o Vendedor ─────────────────────────────────────────────

export async function sendNewLeadNotification(params: {
  sellerEmail: string;
  sellerName: string;
  leadName: string;
  leadPhone: string;
  leadScore: number;
  hairProblem: string;
  landingPageTitle: string;
  dashboardUrl?: string;
}) {
  const scoreColor = params.leadScore >= 70 ? "#ef4444" : params.leadScore >= 40 ? "#f59e0b" : "#64748b";
  const scoreLabel = params.leadScore >= 70 ? "🔥 Quente" : params.leadScore >= 40 ? "🌡️ Morno" : "❄️ Frio";
  const whatsappLink = `https://wa.me/55${params.leadPhone.replace(/\D/g, "")}`;
  const dashUrl = params.dashboardUrl ?? "https://homenzadvanced.com/vendedor";

  return sendEmail({
    to: [{ email: params.sellerEmail, name: params.sellerName }],
    subject: `🔔 Novo lead para você: ${params.leadName}`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Você recebeu um novo lead!</h2>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
        Chegou pela <strong>${params.landingPageTitle}</strong>. Responda rápido — leads quentes esfiam em minutos.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:120px;">Nome</td>
            <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${params.leadName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:13px;">WhatsApp</td>
            <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${params.leadPhone}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Problema</td>
            <td style="padding:6px 0;color:#1e293b;font-size:14px;">${params.hairProblem}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Score</td>
            <td style="padding:6px 0;font-size:14px;font-weight:700;color:${scoreColor};">${scoreLabel} (${params.leadScore}/100)</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <a href="${whatsappLink}" style="display:inline-block;background:#25d366;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">
          Abrir WhatsApp →
        </a>
        <a href="${dashUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">
          Ver no painel →
        </a>
      </div>
    `),
  });
}

// ─── 6. Recuperação de Senha ──────────────────────────────────────────────────

export async function sendPasswordReset(params: {
  email: string;
  name: string;
  resetLink: string;
  userType?: "franqueado" | "vendedor";
}) {
  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject: `Redefinição de senha — Homenz IA`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Redefinir senha</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Olá, <strong>${params.name.split(" ")[0]}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta.
        Clique no botão abaixo para criar uma nova senha.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${params.resetLink}" style="display:inline-block;background:#0d9488;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Redefinir minha senha →
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">
        Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email — sua senha permanece a mesma.
      </p>
    `),
  });
}

// ─── 7. Confirmação de Pagamento (alias para stripeWebhook) ──────────────────

export async function sendPaymentConfirmed(params: {
  email: string;
  name: string;
  plan: string;
  planLabel: string;
}) {
  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject: `✅ Pagamento confirmado — Plano ${params.planLabel} ativo!`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Pagamento confirmado! 🎉</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Olá, <strong>${params.name.split(" ")[0]}</strong>! Seu pagamento foi processado com sucesso.
        O plano <strong>${params.planLabel}</strong> está ativo agora — aproveite todos os recursos.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">Recursos desbloqueados:</p>
        <ul style="margin:8px 0 0;padding-left:20px;color:#166534;font-size:14px;line-height:1.8;">
          <li>Landing pages ilimitadas</li>
          <li>Leads ilimitados</li>
          <li>Pixel + Conversions API por LP</li>
          <li>Painel completo sem restrições</li>
        </ul>
      </div>
      <div style="text-align:center;">
        <a href="https://homenzadvanced.com/franqueado" style="display:inline-block;background:#0d9488;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Acessar meu painel →
        </a>
      </div>
    `),
  });
}

// ─── 8. Cancelamento de Assinatura ───────────────────────────────────────────

export async function sendSubscriptionCancelled(params: {
  email: string;
  name: string;
}) {
  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject: `Sua assinatura foi cancelada — Homenz IA`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Assinatura cancelada</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Olá, <strong>${params.name.split(" ")[0]}</strong>. Sua assinatura da Homenz IA foi cancelada.
        O acesso ao painel e às landing pages foi desativado.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#991b1b;font-size:14px;">
          Se foi um engano ou deseja reativar, entre em contato com o suporte ou assine novamente.
        </p>
      </div>
      <div style="text-align:center;">
        <a href="https://homenzadvanced.com/planos" style="display:inline-block;background:#0d9488;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Reativar minha conta →
        </a>
      </div>
    `),
  });
}

// ─── 9. Aviso de Trial Expirando (cron) ──────────────────────────────────────

export async function sendTrialWarning(params: {
  email: string;
  name: string;
  clinicName: string;
  daysLeft: number;
}) {
  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject: `⏰ ${params.daysLeft} dia${params.daysLeft > 1 ? "s" : ""} restante${params.daysLeft > 1 ? "s" : ""} no seu trial — Homenz IA`,
    htmlContent: wrapTemplate(`
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Seu trial está acabando.</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Olá, <strong>${params.name.split(" ")[0]}</strong>! O trial da <strong>${params.clinicName}</strong> expira em 
        <strong>${params.daysLeft} dia${params.daysLeft > 1 ? "s" : ""}</strong>.
        Assine agora para não perder o acesso ao painel, leads e landing pages.
      </p>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#92400e;font-size:14px;">
          ⚠️ Após o vencimento, o painel será bloqueado e as landing pages ficarão inativas automaticamente.
        </p>
      </div>
      <div style="text-align:center;">
        <a href="https://homenzadvanced.com/planos" style="display:inline-block;background:#f59e0b;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Assinar agora →
        </a>
      </div>
    `),
  });
}

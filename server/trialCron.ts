/**
 * Cron Job: Desativar franquias com trial expirado
 * Executa diariamente à meia-noite (UTC)
 * Desativa franquias onde trial_ends_at < NOW() e active = true e sem assinatura paga
 */
import cron from "node-cron";
import { supabaseAdmin } from "./supabase";
import { notifyOwner } from "./_core/notification";

export function startTrialExpirationCron() {
  // Executa todo dia à meia-noite UTC
  cron.schedule("0 0 * * *", async () => {
    console.log("[TrialCron] Verificando trials expirados e enviando avisos...");
    await Promise.all([
      expireTrials(),
      sendTrialWarningEmails(),
    ]);
  });

  console.log("[TrialCron] Cron de expiração de trial iniciado (diário às 00:00 UTC)");
}

/**
 * Envia avisos de trial expirando (3 dias e 1 dia antes)
 * Deve ser chamado diariamente junto com expireTrials()
 */
export async function sendTrialWarningEmails() {
  const now = new Date();
  const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

  // Buscar franquias que expiram em 1 dia
  const { data: expiring1 } = await supabaseAdmin
    .from('franchises')
    .select('id, name, owner_id')
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', in1Day)
    .eq('active', true)
    .in('plan', ['free']);

  // Buscar franquias que expiram em 3 dias
  const { data: expiring3 } = await supabaseAdmin
    .from('franchises')
    .select('id, name, owner_id')
    .gte('trial_ends_at', in3Days)
    .lte('trial_ends_at', in4Days)
    .eq('active', true)
    .in('plan', ['free']);

  const allExpiring = [
    ...(expiring1 || []).map(f => ({ ...f, daysLeft: 1 })),
    ...(expiring3 || []).map(f => ({ ...f, daysLeft: 3 })),
  ];

  for (const franchise of allExpiring) {
    if (!franchise.owner_id) continue;
    const { data: owner } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', franchise.owner_id)
      .single();

    if (!owner?.email) continue;

    try {
      const { sendTrialWarning } = await import('./brevo');
      await sendTrialWarning({
        email: owner.email,
        name: owner.name ?? owner.email.split('@')[0],
        clinicName: franchise.name,
        daysLeft: franchise.daysLeft,
      });
      console.log(`[TrialCron] Aviso de trial enviado para ${owner.email} (${franchise.daysLeft} dias restantes)`);
    } catch (err) {
      console.error(`[TrialCron] Erro ao enviar aviso de trial para ${owner.email}:`, err);
    }
  }
}

export async function expireTrials() {
  const now = new Date().toISOString();

  // Buscar franquias com trial expirado, ativas, sem plano pago
  const { data: expiredFranchises, error } = await supabaseAdmin
    .from("franchises")
    .select("id, name, owner_id, plan, trial_ends_at")
    .lt("trial_ends_at", now)
    .eq("active", true)
    .in("plan", ["free"]); // Apenas franquias sem plano pago

  if (error) {
    console.error("[TrialCron] Erro ao buscar trials expirados:", error.message);
    return;
  }

  if (!expiredFranchises || expiredFranchises.length === 0) {
    console.log("[TrialCron] Nenhum trial expirado encontrado.");
    return;
  }

  console.log(`[TrialCron] ${expiredFranchises.length} franquia(s) com trial expirado.`);

  for (const franchise of expiredFranchises) {
    // Desativar a franquia
    const { error: franchiseErr } = await supabaseAdmin
      .from("franchises")
      .update({ active: false, updated_at: now })
      .eq("id", franchise.id);

    if (franchiseErr) {
      console.error(`[TrialCron] Erro ao desativar franquia ${franchise.id}:`, franchiseErr.message);
      continue;
    }

    // Desativar o perfil do dono da franquia
    if (franchise.owner_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ active: false, updated_at: now })
        .eq("id", franchise.owner_id);
    }

    console.log(`[TrialCron] ✅ Franquia "${franchise.name}" (${franchise.id}) desativada — trial expirado em ${franchise.trial_ends_at}`);
  }

  // Notificar o dono da rede
  if (expiredFranchises.length > 0) {
    try {
      await notifyOwner({
        title: `${expiredFranchises.length} trial(s) expirado(s)`,
        content: `As seguintes franquias tiveram o trial desativado: ${expiredFranchises.map((f) => f.name).join(", ")}`,
      });
    } catch (err) {
      console.error("[TrialCron] Erro ao notificar dono:", err);
    }
  }
}

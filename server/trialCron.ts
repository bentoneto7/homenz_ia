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
    console.log("[TrialCron] Verificando trials expirados...");
    await expireTrials();
  });

  console.log("[TrialCron] Cron de expiração de trial iniciado (diário às 00:00 UTC)");
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

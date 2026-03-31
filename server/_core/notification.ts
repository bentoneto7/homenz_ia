/**
 * Notificações para o owner do projeto.
 * Fora do ambiente Manus, esta função apenas loga no console.
 * Para notificações reais, configure um webhook via NOTIFICATION_WEBHOOK_URL.
 */

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Envia notificação ao owner. Retorna true se enviada, false se ignorada.
 * Nunca lança exceção — falhas de notificação não devem interromper o fluxo principal.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;

  if (!webhookUrl) {
    // Sem webhook configurado: apenas loga
    console.info(`[Notification] ${payload.title}: ${payload.content}`);
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[Notification] Webhook falhou (${response.status})`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Erro ao enviar webhook:", error);
    return false;
  }
}

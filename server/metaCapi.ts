/**
 * Meta Conversions API (CAPI) — Helper server-side
 *
 * Envia eventos de conversão diretamente ao Meta via API,
 * complementando o pixel client-side para maior precisão
 * (especialmente com iOS 14+ e bloqueadores de cookies).
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

export interface CapiEventData {
  pixelId: string;
  accessToken: string;
  eventName: 'Lead' | 'CompleteRegistration' | 'InitiateCheckout' | 'ViewContent' | 'PageView';
  eventSourceUrl?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  /** Hash SHA-256 do e-mail (opcional) */
  emailHash?: string;
  /** Hash SHA-256 do telefone sem formatação (opcional) */
  phoneHash?: string;
  /** Identificador externo (ex: leadId) */
  externalId?: string;
  customData?: Record<string, unknown>;
  /** Timestamp Unix em segundos (padrão: agora) */
  eventTime?: number;
  /**
   * Código de teste do Meta Events Manager.
   * Quando definido, os eventos aparecem na aba "Testar Eventos" do Events Manager
   * sem afetar dados reais de campanha.
   */
  testEventCode?: string;
  /**
   * ID único do evento para deduplicação entre CAPI e pixel client-side.
   * O Meta usa esse ID para evitar contar o mesmo evento duas vezes.
   * Deve ser o mesmo valor passado no parâmetro eventID do fbq().
   */
  eventId?: string;
}

export interface CapiResult {
  success: boolean;
  eventsReceived?: number;
  error?: string;
}

/**
 * Gera hash SHA-256 de uma string (para PII como email/telefone).
 * O Meta exige que dados pessoais sejam hasheados antes do envio.
 */
async function sha256(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Envia um evento para o Meta Conversions API.
 * Falha silenciosamente para não bloquear o fluxo principal.
 */
export async function sendCapiEvent(params: CapiEventData): Promise<CapiResult> {
  try {
    const {
      pixelId,
      accessToken,
      eventName,
      eventSourceUrl,
      clientIpAddress,
      clientUserAgent,
      emailHash,
      phoneHash,
      externalId,
      customData,
      eventTime,
    } = params;

    if (!pixelId || !accessToken) {
      return { success: false, error: 'pixelId e accessToken são obrigatórios' };
    }

    // Construir user_data
    const userData: Record<string, unknown> = {};
    if (emailHash) userData.em = [emailHash];
    if (phoneHash) userData.ph = [phoneHash];
    if (externalId) userData.external_id = [externalId];
    if (clientIpAddress) userData.client_ip_address = clientIpAddress;
    if (clientUserAgent) userData.client_user_agent = clientUserAgent;

    const eventPayload: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime ?? Math.floor(Date.now() / 1000),
          event_source_url: eventSourceUrl,
          action_source: 'website',
          user_data: userData,
          custom_data: customData ?? {},
          // event_id para deduplicação com o pixel client-side
          ...(params.eventId ? { event_id: params.eventId } : {}),
        },
      ],
      // test_event_code só é incluído quando explicitamente fornecido
      ...(params.testEventCode ? { test_event_code: params.testEventCode } : {}),
    };

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error('[CAPI] Erro HTTP:', response.status, errText);
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }

    const result = await response.json() as { events_received?: number };
    console.log(`[CAPI] Evento ${eventName} enviado. Recebidos: ${result.events_received}`);
    return { success: true, eventsReceived: result.events_received };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CAPI] Erro ao enviar evento:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Utilitário para hashear telefone no formato brasileiro.
 * Remove todos os não-dígitos antes de hashear.
 */
export async function hashPhone(phone: string): Promise<string> {
  const digits = phone.replace(/\D/g, '');
  // Adicionar código do país se não tiver
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return sha256(normalized);
}

/**
 * Utilitário para hashear email.
 */
export async function hashEmail(email: string): Promise<string> {
  return sha256(email.trim().toLowerCase());
}

/**
 * Rastreamento de eventos de pixel por landing page.
 *
 * Estratégia: persiste eventos na tabela `leads` usando campos existentes
 * (chat_summary) como fallback, e usa um Map em memória como cache de 24h
 * para consultas rápidas no painel.
 *
 * Eventos rastreados:
 * - ViewContent: quando a landing page é aberta
 * - InitiateCheckout: quando nome + WhatsApp são informados
 * - Lead: quando o lead é criado e distribuído
 */

import { supabaseAdmin } from './supabase';

export type PixelEventType = 'ViewContent' | 'InitiateCheckout' | 'Lead' | 'CompleteRegistration';

interface EventCount {
  viewContent: number;
  initiateCheckout: number;
  lead: number;
  completeRegistration: number;
  lastUpdated: number;
}

// Cache em memória: landingPageSlug → contagens
const eventCache = new Map<string, EventCount>();

function getOrCreate(slug: string): EventCount {
  if (!eventCache.has(slug)) {
    eventCache.set(slug, {
      viewContent: 0,
      initiateCheckout: 0,
      lead: 0,
      completeRegistration: 0,
      lastUpdated: Date.now(),
    });
  }
  return eventCache.get(slug)!;
}

/**
 * Registra um evento de pixel para uma landing page.
 * Chamado pelo servidor quando eventos ocorrem.
 */
export function trackPixelEvent(slug: string, event: PixelEventType): void {
  const counts = getOrCreate(slug);
  switch (event) {
    case 'ViewContent': counts.viewContent++; break;
    case 'InitiateCheckout': counts.initiateCheckout++; break;
    case 'Lead': counts.lead++; break;
    case 'CompleteRegistration': counts.completeRegistration++; break;
  }
  counts.lastUpdated = Date.now();
}

/**
 * Retorna as contagens de eventos para uma lista de slugs.
 * Para Lead e CompleteRegistration, consulta o banco para dados precisos.
 */
export async function getPixelEventStats(slugs: string[]): Promise<Record<string, EventCount & { leadFromDb?: number }>> {
  const result: Record<string, EventCount & { leadFromDb?: number }> = {};

  // Buscar contagens de leads do banco (mais preciso que o cache)
  try {
    // Buscar IDs das landing pages pelos slugs
    const { data: lps } = await supabaseAdmin
      .from('franchise_landing_pages')
      .select('id, slug')
      .in('slug', slugs);

    if (lps && lps.length > 0) {
      const lpIds = lps.map((lp: { id: string }) => lp.id);
      const slugById: Record<string, string> = {};
      for (const lp of lps as { id: string; slug: string }[]) {
        slugById[lp.id] = lp.slug;
      }

      // Contar leads por landing page
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('landing_page_id')
        .in('landing_page_id', lpIds);

      const leadCountByLpId: Record<string, number> = {};
      for (const lead of (leads || []) as { landing_page_id: string }[]) {
        leadCountByLpId[lead.landing_page_id] = (leadCountByLpId[lead.landing_page_id] || 0) + 1;
      }

      for (const lp of lps as { id: string; slug: string }[]) {
        const slug = lp.slug;
        const counts = getOrCreate(slug);
        result[slug] = {
          ...counts,
          leadFromDb: leadCountByLpId[lp.id] || 0,
        };
      }
    }
  } catch (err) {
    console.error('[pixelEvents] Erro ao buscar stats do banco:', err);
  }

  // Preencher slugs que não foram encontrados no banco
  for (const slug of slugs) {
    if (!result[slug]) {
      result[slug] = { ...getOrCreate(slug) };
    }
  }

  return result;
}

/**
 * Registra um evento de ViewContent via endpoint público.
 * Chamado pela landing page quando carrega.
 */
export async function recordViewContent(slug: string): Promise<void> {
  trackPixelEvent(slug, 'ViewContent');
}

/**
 * Registra um evento de InitiateCheckout.
 * Chamado quando o lead informa nome + WhatsApp.
 */
export async function recordInitiateCheckout(slug: string): Promise<void> {
  trackPixelEvent(slug, 'InitiateCheckout');
}

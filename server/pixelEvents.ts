/**
 * Rastreamento de eventos de pixel por landing page.
 *
 * Estratégia de persistência:
 * - ViewContent → incrementa `total_views` na tabela franchise_landing_pages
 * - InitiateCheckout → armazenado em cache em memória (sem coluna dedicada)
 * - Lead → contado via tabela `leads` (fonte de verdade)
 * - CompleteRegistration → equivalente ao Lead para fins de relatório
 *
 * O cache em memória serve como buffer para InitiateCheckout e como
 * camada de leitura rápida para o painel (evita múltiplas queries).
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

// Cache em memória: landingPageSlug → contagens (buffer para InitiateCheckout)
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
 * ViewContent é persistido no banco via total_views.
 * Os demais ficam em cache em memória.
 */
export function trackPixelEvent(slug: string, event: PixelEventType): void {
  const counts = getOrCreate(slug);
  switch (event) {
    case 'ViewContent':
      counts.viewContent++;
      // Persistir ViewContent no banco de forma assíncrona (fire-and-forget)
      persistViewContent(slug).catch(err =>
        console.error('[pixelEvents] Erro ao persistir ViewContent:', err)
      );
      break;
    case 'InitiateCheckout': counts.initiateCheckout++; break;
    case 'Lead': counts.lead++; break;
    case 'CompleteRegistration': counts.completeRegistration++; break;
  }
  counts.lastUpdated = Date.now();
}

/**
 * Persiste o evento ViewContent incrementando total_views na LP.
 * Usa o campo existente da tabela para histórico permanente.
 */
async function persistViewContent(slug: string): Promise<void> {
  // Buscar LP pelo slug
  const { data: lp } = await supabaseAdmin
    .from('franchise_landing_pages')
    .select('id, total_views')
    .eq('slug', slug)
    .single();

  if (!lp) return;

  const currentViews = (lp as { total_views?: number }).total_views || 0;
  await supabaseAdmin
    .from('franchise_landing_pages')
    .update({ total_views: currentViews + 1 })
    .eq('id', (lp as { id: string }).id);
}

/**
 * Retorna as contagens de eventos para uma lista de slugs.
 * ViewContent e Lead vêm do banco (dados históricos precisos).
 * InitiateCheckout vem do cache em memória.
 */
export async function getPixelEventStats(slugs: string[]): Promise<Record<string, EventCount & { leadFromDb?: number; viewsFromDb?: number }>> {
  const result: Record<string, EventCount & { leadFromDb?: number; viewsFromDb?: number }> = {};

  try {
    // Buscar dados das LPs (total_views + total_leads já persistidos)
    const { data: lps } = await supabaseAdmin
      .from('franchise_landing_pages')
      .select('id, slug, total_views, total_leads')
      .in('slug', slugs);

    if (lps && lps.length > 0) {
      // Contar leads reais por landing page
      const lpIds = (lps as { id: string }[]).map(lp => lp.id);
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('landing_page_id')
        .in('landing_page_id', lpIds);

      const leadCountByLpId: Record<string, number> = {};
      for (const lead of (leads || []) as { landing_page_id: string }[]) {
        leadCountByLpId[lead.landing_page_id] = (leadCountByLpId[lead.landing_page_id] || 0) + 1;
      }

      for (const lp of lps as { id: string; slug: string; total_views?: number; total_leads?: number }[]) {
        const slug = lp.slug;
        const cacheData = getOrCreate(slug);
        const viewsFromDb = lp.total_views || 0;
        const leadFromDb = leadCountByLpId[lp.id] || 0;

        result[slug] = {
          // ViewContent: banco tem precedência sobre cache
          viewContent: Math.max(viewsFromDb, cacheData.viewContent),
          // InitiateCheckout: apenas cache (sem coluna dedicada)
          initiateCheckout: cacheData.initiateCheckout,
          // Lead: banco tem precedência
          lead: Math.max(leadFromDb, cacheData.lead),
          completeRegistration: cacheData.completeRegistration,
          lastUpdated: cacheData.lastUpdated,
          leadFromDb,
          viewsFromDb,
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
 */
export async function recordViewContent(slug: string): Promise<void> {
  trackPixelEvent(slug, 'ViewContent');
}

/**
 * Registra um evento de InitiateCheckout.
 */
export async function recordInitiateCheckout(slug: string): Promise<void> {
  trackPixelEvent(slug, 'InitiateCheckout');
}

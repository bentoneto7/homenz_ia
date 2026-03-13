/**
 * Motor de Distribuição de Leads — Round-Robin Igualitário
 * 
 * Lógica:
 * 1. Lead chega via landing page de uma franquia
 * 2. Se a LP tiver vendedores vinculados (landing_page_sellers), usa APENAS esses
 * 3. Caso contrário, usa todos os vendedores ativos da franquia (fallback)
 * 4. Pega o índice do último vendedor que recebeu lead (franchise_round_robin)
 * 5. Avança para o próximo (circular: 0 → 1 → 2 → 0 → ...)
 * 6. Atribui o lead ao vendedor selecionado
 * 7. Registra no log de distribuição
 * 8. Atualiza o índice no round-robin
 */

import { createClient } from '@supabase/supabase-js';
import { notifyOwner } from './_core/notification';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DistributeLeadInput {
  leadId: string;
  franchiseId: string;
  landingPageId?: string;
}

export interface DistributeLeadResult {
  success: boolean;
  sellerId?: string;
  sellerName?: string;
  sellerPosition?: number;
  totalSellers?: number;
  error?: string;
}

/**
 * Busca os vendedores vinculados a uma landing page específica no TiDB.
 * Retorna array vazio se não houver vínculos ou se o TiDB estiver indisponível.
 */
async function getLandingPageSellerIds(landingPageId: string): Promise<{ id: string; name: string }[]> {
  try {
    const { getDb } = await import('./db');
    const db = await getDb();
    if (!db) return [];

    const { landingPageSellers } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');

    const rows = await db
      .select()
      .from(landingPageSellers)
      .where(eq(landingPageSellers.landingPageId, landingPageId));

    return rows.map((r) => ({ id: r.sellerId, name: r.sellerName ?? '' }));
  } catch (err) {
    console.error('[LeadDistribution] Erro ao buscar vendedores da LP:', err);
    return [];
  }
}

/**
 * Distribui um lead para o próximo vendedor da fila (round-robin)
 * Se a LP tiver vendedores vinculados, distribui apenas entre eles.
 * Caso contrário, distribui entre todos os vendedores ativos da franquia.
 */
export async function distributeLeadRoundRobin(
  input: DistributeLeadInput
): Promise<DistributeLeadResult> {
  const { leadId, franchiseId, landingPageId } = input;

  try {
    let sellers: { id: string; name: string; email?: string }[] = [];
    let distributionScope = 'franchise'; // para o log

    // 1. Se houver landingPageId, tentar buscar vendedores vinculados à LP
    if (landingPageId) {
      const lpSellers = await getLandingPageSellerIds(landingPageId);
      if (lpSellers.length > 0) {
        // Verificar que os vendedores ainda estão ativos no Supabase
        const { data: activeSellers } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('franchise_id', franchiseId)
          .eq('role', 'seller')
          .eq('active', true)
          .in('id', lpSellers.map((s) => s.id));

        if (activeSellers && activeSellers.length > 0) {
          // Manter a ordem original dos vendedores vinculados (consistência do round-robin)
          sellers = lpSellers
            .filter((lps) => activeSellers.some((as) => as.id === lps.id))
            .map((lps) => {
              const active = activeSellers.find((as) => as.id === lps.id)!;
              return { id: active.id, name: active.name, email: active.email };
            });
          distributionScope = `lp:${landingPageId}`;
        }
      }
    }

    // 2. Fallback: usar todos os vendedores ativos da franquia
    if (sellers.length === 0) {
      const { data: allSellers, error: sellersError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('franchise_id', franchiseId)
        .eq('role', 'seller')
        .eq('active', true)
        .order('created_at', { ascending: true }); // ordem consistente

      if (sellersError) throw new Error('Erro ao buscar vendedores: ' + sellersError.message);
      if (!allSellers || allSellers.length === 0) {
        return { success: false, error: 'Nenhum vendedor ativo nesta franquia' };
      }
      sellers = allSellers;
      distributionScope = 'franchise';
    }

    // 3. Buscar estado atual do round-robin da franquia
    // Usamos uma chave composta: franchise_id + scope para separar RR por LP
    const rrKey = distributionScope === 'franchise' ? franchiseId : `${franchiseId}__${landingPageId}`;
    
    const { data: rrData, error: rrError } = await supabase
      .from('franchise_round_robin')
      .select('id, last_seller_index, total_distributed')
      .eq('franchise_id', rrKey)
      .single();

    if (rrError && rrError.code !== 'PGRST116') {
      // PGRST116 = not found (primeira vez) — não é erro
      throw new Error('Erro ao buscar round-robin: ' + rrError.message);
    }

    // 4. Calcular próximo índice (circular)
    const currentIndex = rrData?.last_seller_index ?? -1;
    const nextIndex = (currentIndex + 1) % sellers.length;
    const selectedSeller = sellers[nextIndex];

    // 5. Atualizar o lead com o vendedor atribuído
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        assigned_to: selectedSeller.id,
        distribution_status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (leadUpdateError) throw new Error('Erro ao atualizar lead: ' + leadUpdateError.message);

    // 6. Atualizar ou inserir o estado do round-robin
    const totalDistributed = (rrData?.total_distributed ?? 0) + 1;
    
    if (rrData) {
      await supabase
        .from('franchise_round_robin')
        .update({
          last_seller_index: nextIndex,
          total_distributed: totalDistributed,
          updated_at: new Date().toISOString(),
        })
        .eq('franchise_id', rrKey);
    } else {
      await supabase
        .from('franchise_round_robin')
        .insert({
          franchise_id: rrKey,
          last_seller_index: nextIndex,
          total_distributed: totalDistributed,
        });
    }

    // 7. Registrar no log de distribuição
    await supabase
      .from('lead_distribution_log')
      .insert({
        lead_id: leadId,
        franchise_id: franchiseId,
        seller_id: selectedSeller.id,
        method: 'round_robin',
        seller_position: nextIndex,
        notes: `Distribuído automaticamente para ${selectedSeller.name} (posição ${nextIndex + 1} de ${sellers.length}) [escopo: ${distributionScope}]`,
      });

    // 8. Notificar o dono da plataforma sobre novo lead distribuído
    notifyOwner({
      title: '🔥 Novo lead distribuído!',
      content: `Lead atribuído a ${selectedSeller.name} na franquia. Verifique o painel para acompanhar.`,
    }).catch(() => {}); // não bloquear se falhar

    // 9. Enviar email de novo lead para o vendedor (se tiver email)
    if (selectedSeller.email) {
      try {
        // Buscar dados completos do lead para o email
        const { data: leadData } = await supabase
          .from('leads')
          .select('name, phone, hair_problem, lead_score, landing_page_id')
          .eq('id', leadId)
          .single();

        if (leadData) {
          // Buscar título da LP
          let lpTitle = 'Landing Page';
          if (leadData.landing_page_id) {
            const { data: lpData } = await supabase
              .from('franchise_landing_pages')
              .select('city, state')
              .eq('id', leadData.landing_page_id)
              .single();
            if (lpData) lpTitle = `LP ${lpData.city}/${lpData.state}`;
          }

          const { sendNewLeadNotification } = await import('./brevo');
          await sendNewLeadNotification({
            sellerEmail: selectedSeller.email,
            sellerName: selectedSeller.name,
            leadName: leadData.name,
            leadPhone: leadData.phone,
            leadScore: leadData.lead_score ?? 50,
            hairProblem: leadData.hair_problem ?? 'Não informado',
            landingPageTitle: lpTitle,
          });
        }
      } catch (emailErr) {
        console.error('[Brevo] Erro ao enviar email de novo lead:', emailErr);
      }
    }

    return {
      success: true,
      sellerId: selectedSeller.id,
      sellerName: selectedSeller.name,
      sellerPosition: nextIndex + 1,
      totalSellers: sellers.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[LeadDistribution] Erro:', message);
    return { success: false, error: message };
  }
}

/**
 * Cria um novo lead e distribui automaticamente
 */
export interface CreateAndDistributeLeadInput {
  franchiseId: string;
  landingPageId?: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  hairProblem?: string;
  photoUrl?: string;
  city?: string;
  state?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  chatSummary?: string;
}

export async function createAndDistributeLead(
  input: CreateAndDistributeLeadInput
): Promise<{ leadId: string; distribution: DistributeLeadResult }> {
  const {
    franchiseId, landingPageId, name, phone, email, age,
    hairProblem, photoUrl, city, state,
    utmSource, utmMedium, utmCampaign, chatSummary
  } = input;

  // 1. Criar o lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      franchise_id: franchiseId,
      landing_page_id: landingPageId || null,
      name,
      phone,
      email: email || null,
      age: age || null,
      hair_problem: hairProblem || null,
      photo_url: photoUrl || null,
      city: city || null,
      state: state || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      chat_answers: chatSummary ? { summary: chatSummary } : null,
      distribution_status: 'pending',
      lead_score: calculateInitialScore({ age, hairProblem, photoUrl, chatSummary }),
      temperature: calculateTemperature(calculateInitialScore({ age, hairProblem, photoUrl, chatSummary })),
    })
    .select('id')
    .single();

  if (leadError || !lead) {
    throw new Error('Erro ao criar lead: ' + (leadError?.message || 'sem dados'));
  }

  // 2. Incrementar contador de leads na landing page
  if (landingPageId) {
    // Atualiza contador diretamente via select+update
    const { data: lpData } = await supabase
      .from('franchise_landing_pages')
      .select('total_leads')
      .eq('id', landingPageId)
      .single();
    if (lpData) {
      await supabase
        .from('franchise_landing_pages')
        .update({ total_leads: (lpData.total_leads || 0) + 1 })
        .eq('id', landingPageId);
    }
  }

  // 3. Distribuir o lead (usando vendedores específicos da LP se disponíveis)
  const distribution = await distributeLeadRoundRobin({
    leadId: lead.id,
    franchiseId,
    landingPageId,
  });

  return { leadId: lead.id, distribution };
}

/**
 * Calcula temperatura do lead baseado no score
 */
function calculateTemperature(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

/**
 * Calcula score inicial do lead baseado nos dados coletados
 */
function calculateInitialScore(data: {
  age?: number;
  hairProblem?: string;
  photoUrl?: string;
  chatSummary?: string;
}): number {
  let score = 50; // base

  // Foto enviada = alta intenção (+20)
  if (data.photoUrl) score += 20;

  // Completou o chat = engajamento alto (+15)
  if (data.chatSummary && data.chatSummary.length > 50) score += 15;

  // Faixa etária com maior conversão (30-55) (+10)
  if (data.age && data.age >= 30 && data.age <= 55) score += 10;

  // Problema específico mencionado (+5)
  if (data.hairProblem && data.hairProblem.length > 10) score += 5;

  return Math.min(score, 100);
}

/**
 * Busca estatísticas de distribuição de uma franquia
 */
export async function getFranchiseDistributionStats(franchiseId: string) {
  const { data: sellers } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('franchise_id', franchiseId)
    .eq('role', 'seller')
    .eq('active', true);

  const { data: logs } = await supabase
    .from('lead_distribution_log')
    .select('seller_id, created_at')
    .eq('franchise_id', franchiseId)
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: rr } = await supabase
    .from('franchise_round_robin')
    .select('last_seller_index, total_distributed')
    .eq('franchise_id', franchiseId)
    .single();

  // Contar leads por vendedor
  const sellerCounts: Record<string, number> = {};
  for (const log of (logs || [])) {
    sellerCounts[log.seller_id] = (sellerCounts[log.seller_id] || 0) + 1;
  }

  return {
    totalDistributed: rr?.total_distributed || 0,
    currentPosition: rr?.last_seller_index ?? -1,
    sellers: (sellers || []).map((s, idx) => ({
      id: s.id,
      name: s.name,
      leadsReceived: sellerCounts[s.id] || 0,
      isNext: idx === ((rr?.last_seller_index ?? -1) + 1) % (sellers?.length || 1),
    })),
  };
}

/**
 * Motor de Distribuição de Leads — Round-Robin Igualitário
 * 
 * Lógica:
 * 1. Lead chega via landing page de uma franquia
 * 2. Sistema busca todos os vendedores ativos da franquia
 * 3. Pega o índice do último vendedor que recebeu lead (franchise_round_robin)
 * 4. Avança para o próximo (circular: 0 → 1 → 2 → 0 → ...)
 * 5. Atribui o lead ao vendedor selecionado
 * 6. Registra no log de distribuição
 * 7. Atualiza o índice no round-robin
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
 * Distribui um lead para o próximo vendedor da fila (round-robin)
 */
export async function distributeLeadRoundRobin(
  input: DistributeLeadInput
): Promise<DistributeLeadResult> {
  const { leadId, franchiseId } = input;

  try {
    // 1. Buscar todos os vendedores ativos da franquia
    const { data: sellers, error: sellersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('franchise_id', franchiseId)
      .eq('role', 'seller')
      .eq('active', true)
      .order('created_at', { ascending: true }); // ordem consistente

    if (sellersError) throw new Error('Erro ao buscar vendedores: ' + sellersError.message);
    if (!sellers || sellers.length === 0) {
      return { success: false, error: 'Nenhum vendedor ativo nesta franquia' };
    }

    // 2. Buscar estado atual do round-robin da franquia
    const { data: rrData, error: rrError } = await supabase
      .from('franchise_round_robin')
      .select('id, last_seller_index, total_distributed')
      .eq('franchise_id', franchiseId)
      .single();

    if (rrError && rrError.code !== 'PGRST116') {
      throw new Error('Erro ao buscar round-robin: ' + rrError.message);
    }

    // 3. Calcular próximo índice (circular)
    const currentIndex = rrData?.last_seller_index ?? -1;
    const nextIndex = (currentIndex + 1) % sellers.length;
    const selectedSeller = sellers[nextIndex];

    // 4. Atualizar o lead com o vendedor atribuído
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        assigned_to: selectedSeller.id,
        distribution_status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (leadUpdateError) throw new Error('Erro ao atualizar lead: ' + leadUpdateError.message);

    // 5. Atualizar ou inserir o estado do round-robin
    const totalDistributed = (rrData?.total_distributed ?? 0) + 1;
    
    if (rrData) {
      await supabase
        .from('franchise_round_robin')
        .update({
          last_seller_index: nextIndex,
          total_distributed: totalDistributed,
          updated_at: new Date().toISOString(),
        })
        .eq('franchise_id', franchiseId);
    } else {
      await supabase
        .from('franchise_round_robin')
        .insert({
          franchise_id: franchiseId,
          last_seller_index: nextIndex,
          total_distributed: totalDistributed,
        });
    }

    // 6. Registrar no log de distribuição
    await supabase
      .from('lead_distribution_log')
      .insert({
        lead_id: leadId,
        franchise_id: franchiseId,
        seller_id: selectedSeller.id,
        method: 'round_robin',
        seller_position: nextIndex,
        notes: `Distribuído automaticamente para ${selectedSeller.name} (posição ${nextIndex + 1} de ${sellers.length})`,
      });

    // 7. Notificar o dono da plataforma sobre novo lead distribuído
    notifyOwner({
      title: '🔥 Novo lead distribuído!',
      content: `Lead atribuído a ${selectedSeller.name} na franquia. Verifique o painel para acompanhar.`,
    }).catch(() => {}); // não bloquear se falhar

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

  // 3. Distribuir o lead
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

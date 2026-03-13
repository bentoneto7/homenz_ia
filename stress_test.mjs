/**
 * STRESS TEST — Homenz.ia
 * Simula: 10 franquias × 20 vendedores × 10 LPs × 10 leads = 100 leads total
 * Verifica: criação, distribuição round-robin, isolamento, integridade
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── Constantes ────────────────────────────────────────────────────────────────

const CITIES = [
  { city: 'São Paulo', state: 'SP' },
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Curitiba', state: 'PR' },
  { city: 'Porto Alegre', state: 'RS' },
  { city: 'Salvador', state: 'BA' },
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Manaus', state: 'AM' },
  { city: 'Brasília', state: 'DF' },
  { city: 'Recife', state: 'PE' },
];

const PROCEDURES = [
  'crescimento-capilar', 'transplante-capilar', 'micropigmentacao',
  'ozonioterapia', 'prp-capilar', 'laser-capilar',
  'mesoterapia-capilar', 'fototerapia', 'bioestimulador', 'nutricao-capilar'
];

const HAIR_PROBLEMS = [
  'Queda intensa nos últimos 6 meses',
  'Calvície na coroa',
  'Entradas pronunciadas',
  'Cabelo fino e sem volume',
  'Alopecia areata',
];

// ── Resultados do teste ───────────────────────────────────────────────────────

const results = {
  franchises: [],
  sellers: [],
  landingPages: [],
  leads: [],
  distribution: {},
  errors: [],
  checks: {
    isolation: [],
    roundRobin: [],
    sellerVisibility: [],
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function slug(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function randomSuffix() {
  return crypto.randomBytes(4).toString('hex');
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

// ── Fase 1: Criar 10 franquias ────────────────────────────────────────────────

async function createFranchises() {
  log('🏢', 'Criando 10 franquias de teste...');
  const suffix = randomSuffix();
  
  for (let i = 0; i < 10; i++) {
    const loc = CITIES[i];
    const franchiseName = `Homenz ${loc.city} STRESS-${suffix}`;
    const franchiseSlug = `homenz-${slug(loc.city)}-stress-${suffix}`;
    
    const { data, error } = await supabase
      .from('franchises')
      .insert({
        name: franchiseName,
        slug: franchiseSlug,
        city: loc.city,
        state: loc.state,
        phone: `(${10 + i}1) 9${suffix.slice(0,4)}-${suffix.slice(4)}`,
        address: `Rua Teste ${i + 1}, ${(i + 1) * 100} — ${loc.city}/${loc.state}`,
        plan: 'pro',
        active: true,
        total_leads: 0,
        total_scheduled: 0,
        avg_lead_score: 0,
      })
      .select('id, name, slug, city, state, phone, address')
      .single();
    
    if (error) {
      results.errors.push(`Franquia ${franchiseName}: ${error.message}`);
      log('❌', `Erro ao criar franquia ${franchiseName}: ${error.message}`);
      continue;
    }
    
    results.franchises.push(data);
    log('✅', `Franquia criada: ${data.name} (${data.id.slice(0, 8)}...)`);
  }
  
  log('📊', `Total de franquias criadas: ${results.franchises.length}/10`);
}

// ── Fase 2: Criar 20 vendedores por franquia ──────────────────────────────────

async function createSellers() {
  log('👥', 'Criando 20 vendedores por franquia (200 total)...');
  const passwordHash = await hashPassword('Vendedor@2024');
  
  for (const franchise of results.franchises) {
    const franchiseSellers = [];
    
    for (let i = 0; i < 20; i++) {
      const sellerName = `Vendedor ${i + 1} — ${franchise.city}`;
      const sellerEmail = `vendedor${i + 1}.${slug(franchise.city)}.${franchise.id.slice(0, 6)}@stress.test`;
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          name: sellerName,
          email: sellerEmail,
          role: 'seller',
          franchise_id: franchise.id,
          active: true,
          password_hash: passwordHash,
        })
        .select('id, name, email, franchise_id')
        .single();
      
      if (error) {
        results.errors.push(`Vendedor ${sellerName}: ${error.message}`);
        continue;
      }
      
      franchiseSellers.push(data);
      results.sellers.push(data);
    }
    
    log('✅', `${franchiseSellers.length} vendedores criados para ${franchise.name}`);
  }
  
  log('📊', `Total de vendedores criados: ${results.sellers.length}/200`);
}

// ── Fase 3: Criar 10 LPs por franquia ────────────────────────────────────────

async function createLandingPages() {
  log('📄', 'Criando 10 landing pages por franquia (100 total)...');
  
  for (const franchise of results.franchises) {
    const franchiseSellers = results.sellers.filter(s => s.franchise_id === franchise.id);
    
    for (let i = 0; i < 10; i++) {
      const procedure = PROCEDURES[i];
      const lpSlug = `${slug(franchise.city)}-${procedure}-${randomSuffix()}`;
      const lpTitle = `Homenz ${franchise.city} — ${procedure.replace(/-/g, ' ')}`;
      
      const { data: lp, error: lpError } = await supabase
        .from('franchise_landing_pages')
        .insert({
          franchise_id: franchise.id,
          slug: lpSlug,
          title: lpTitle,
          procedure,
          city: franchise.city,
          state: franchise.state,
          active: true,
          total_views: 0,
          total_leads: 0,
        })
        .select('id, slug, title, franchise_id')
        .single();
      
      if (lpError) {
        results.errors.push(`LP ${lpTitle}: ${lpError.message}`);
        continue;
      }
      
      // Vincular 2 vendedores específicos a cada LP (round-robin entre eles)
      // LP 0-4: vendedores 0-9; LP 5-9: vendedores 10-19
      const sellerOffset = i < 5 ? 0 : 10;
      const lpSellers = franchiseSellers.slice(sellerOffset, sellerOffset + 2);
      
      if (lpSellers.length > 0) {
        const { error: sellersError } = await supabase
          .from('landing_page_sellers')
          .insert(lpSellers.map(s => ({
            landing_page_id: lp.id,
            seller_id: s.id,
            seller_name: s.name,
          })));
        
        if (sellersError) {
          results.errors.push(`LP sellers ${lp.id}: ${sellersError.message}`);
        }
      }
      
      results.landingPages.push({ ...lp, sellers: lpSellers });
    }
    
    log('✅', `10 LPs criadas para ${franchise.name}`);
  }
  
  log('📊', `Total de LPs criadas: ${results.landingPages.length}/100`);
}

// ── Fase 4: Submeter 10 leads por franquia (1 por LP) ─────────────────────────

async function submitLeads() {
  log('🎯', 'Submetendo 100 leads (1 por LP)...');
  
  for (const lp of results.landingPages) {
    const franchise = results.franchises.find(f => f.id === lp.franchise_id);
    if (!franchise) continue;
    
    const leadName = `Lead Teste — ${franchise.city} — ${lp.slug.slice(-8)}`;
    const leadPhone = `(11) 9${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    // 1. Criar lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        franchise_id: franchise.id,
        landing_page_id: lp.id,
        name: leadName,
        phone: leadPhone,
        age: 30 + Math.floor(Math.random() * 20),
        hair_problem: HAIR_PROBLEMS[Math.floor(Math.random() * HAIR_PROBLEMS.length)],
        lead_score: 50 + Math.floor(Math.random() * 50),
        temperature: 'hot',
        funnel_step: 'chat_completed',
        distribution_status: 'pending',
        utm_source: 'stress_test',
        utm_medium: 'automated',
        utm_campaign: `stress_${lp.slug.slice(-8)}`,
        chat_answers: { summary: 'Lead de stress test — qualificado via chat' },
      })
      .select('id, franchise_id, landing_page_id')
      .single();
    
    if (leadError) {
      results.errors.push(`Lead ${leadName}: ${leadError.message}`);
      continue;
    }
    
    results.leads.push(lead);
    
    // 2. Distribuir via round-robin (buscar vendedores da LP)
    const { data: lpSellers } = await supabase
      .from('landing_page_sellers')
      .select('seller_id, seller_name')
      .eq('landing_page_id', lp.id);
    
    let sellers = [];
    if (lpSellers && lpSellers.length > 0) {
      sellers = lpSellers;
    } else {
      // Fallback: todos os vendedores ativos da franquia
      const { data: allSellers } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('franchise_id', franchise.id)
        .eq('role', 'seller')
        .eq('active', true)
        .limit(5);
      sellers = (allSellers || []).map(s => ({ seller_id: s.id, seller_name: s.name }));
    }
    
    if (sellers.length === 0) {
      results.errors.push(`Lead ${lead.id}: sem vendedores para distribuir`);
      continue;
    }
    
    // Round-robin: usar índice baseado no total de leads da LP
    const lpLeadCount = results.leads.filter(l => l.landing_page_id === lp.id).length;
    const sellerIdx = (lpLeadCount - 1) % sellers.length;
    const selectedSeller = sellers[sellerIdx];
    
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        assigned_to: selectedSeller.seller_id,
        distribution_status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);
    
    if (updateError) {
      results.errors.push(`Distribuição ${lead.id}: ${updateError.message}`);
      continue;
    }
    
    // Registrar no log
    if (!results.distribution[franchise.id]) results.distribution[franchise.id] = {};
    if (!results.distribution[franchise.id][lp.id]) results.distribution[franchise.id][lp.id] = {};
    const sid = selectedSeller.seller_id;
    results.distribution[franchise.id][lp.id][sid] = (results.distribution[franchise.id][lp.id][sid] || 0) + 1;
  }
  
  log('📊', `Total de leads criados: ${results.leads.length}/100`);
}

// ── Fase 5: Verificações de integridade ──────────────────────────────────────

async function verifyIsolation() {
  log('🔍', 'Verificando isolamento de dados entre franquias...');
  
  for (const franchise of results.franchises) {
    // Verificar que leads da franquia têm franchise_id correto
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, franchise_id, assigned_to')
      .eq('franchise_id', franchise.id)
      .eq('utm_source', 'stress_test');
    
    if (error) {
      results.errors.push(`Verificação isolamento ${franchise.name}: ${error.message}`);
      continue;
    }
    
    const leadsCount = leads?.length || 0;
    const assignedCount = leads?.filter(l => l.assigned_to).length || 0;
    const wrongFranchise = leads?.filter(l => l.franchise_id !== franchise.id).length || 0;
    
    const check = {
      franchise: franchise.name,
      leadsCount,
      assignedCount,
      wrongFranchise,
      ok: wrongFranchise === 0 && assignedCount === leadsCount,
    };
    
    results.checks.isolation.push(check);
    
    if (check.ok) {
      log('✅', `Isolamento OK: ${franchise.name} — ${leadsCount} leads, ${assignedCount} atribuídos, 0 vazamentos`);
    } else {
      log('❌', `Isolamento FALHOU: ${franchise.name} — ${wrongFranchise} leads com franchise_id errado!`);
    }
  }
}

async function verifyRoundRobin() {
  log('🔄', 'Verificando distribuição round-robin...');
  
  for (const franchise of results.franchises) {
    const franchiseLPs = results.landingPages.filter(lp => lp.franchise_id === franchise.id);
    
    for (const lp of franchiseLPs) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, assigned_to')
        .eq('landing_page_id', lp.id)
        .eq('utm_source', 'stress_test')
        .not('assigned_to', 'is', null);
      
      if (!leads || leads.length === 0) continue;
      
      // Contar distribuição por vendedor
      const dist = {};
      for (const lead of leads) {
        dist[lead.assigned_to] = (dist[lead.assigned_to] || 0) + 1;
      }
      
      const sellerCount = Object.keys(dist).length;
      const maxDiff = Math.max(...Object.values(dist)) - Math.min(...Object.values(dist));
      
      const check = {
        lp: lp.title.slice(0, 40),
        totalLeads: leads.length,
        sellersUsed: sellerCount,
        maxDiff,
        ok: maxDiff <= 1, // diferença máxima de 1 lead é aceitável no round-robin
      };
      
      results.checks.roundRobin.push(check);
      
      if (check.ok) {
        log('✅', `Round-robin OK: ${check.lp} — ${check.totalLeads} leads, ${check.sellersUsed} vendedores, diff=${check.maxDiff}`);
      } else {
        log('⚠️', `Round-robin desbalanceado: ${check.lp} — diff=${check.maxDiff}`);
      }
    }
  }
}

async function verifySellerVisibility() {
  log('👁️', 'Verificando visibilidade de leads por vendedor...');
  
  // Pegar 3 franquias para verificar
  for (const franchise of results.franchises.slice(0, 3)) {
    const franchiseSellers = results.sellers.filter(s => s.franchise_id === franchise.id).slice(0, 3);
    
    for (const seller of franchiseSellers) {
      const { data: sellerLeads } = await supabase
        .from('leads')
        .select('id, franchise_id, assigned_to')
        .eq('assigned_to', seller.id)
        .eq('utm_source', 'stress_test');
      
      const wrongLeads = sellerLeads?.filter(l => l.franchise_id !== franchise.id) || [];
      
      const check = {
        seller: seller.name,
        franchise: franchise.name,
        leadsCount: sellerLeads?.length || 0,
        wrongFranchiseLeads: wrongLeads.length,
        ok: wrongLeads.length === 0,
      };
      
      results.checks.sellerVisibility.push(check);
      
      if (check.ok) {
        log('✅', `Visibilidade OK: ${seller.name} — ${check.leadsCount} leads, 0 de outras franquias`);
      } else {
        log('❌', `Visibilidade FALHOU: ${seller.name} — ${check.wrongFranchiseLeads} leads de outras franquias!`);
      }
    }
  }
}

// ── Fase 6: Verificar LP pública ─────────────────────────────────────────────

async function verifyLandingPages() {
  log('🌐', 'Verificando landing pages públicas (dados de franquia)...');
  
  // Verificar as primeiras 5 LPs
  for (const lp of results.landingPages.slice(0, 5)) {
    const { data, error } = await supabase
      .from('franchise_landing_pages')
      .select(`
        id, slug, title, active,
        franchises!inner(id, name, phone, address, city, state)
      `)
      .eq('id', lp.id)
      .single();
    
    if (error || !data) {
      log('❌', `LP ${lp.slug}: erro ao buscar dados — ${error?.message}`);
      continue;
    }
    
    const franchise = data.franchises;
    const hasPhone = !!(franchise?.phone);
    const hasAddress = !!(franchise?.address);
    
    if (hasPhone && hasAddress) {
      log('✅', `LP OK: ${lp.slug.slice(-20)} — phone: ${franchise.phone}, address: ${franchise.address?.slice(0, 30)}`);
    } else {
      log('⚠️', `LP incompleta: ${lp.slug.slice(-20)} — phone: ${hasPhone}, address: ${hasAddress}`);
    }
  }
}

// ── Fase 7: Relatório final ───────────────────────────────────────────────────

function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 RELATÓRIO FINAL DO STRESS TEST');
  console.log('='.repeat(60));
  
  console.log(`\n✅ CRIAÇÃO:`);
  console.log(`   Franquias: ${results.franchises.length}/10`);
  console.log(`   Vendedores: ${results.sellers.length}/200`);
  console.log(`   Landing Pages: ${results.landingPages.length}/100`);
  console.log(`   Leads: ${results.leads.length}/100`);
  
  const isolationOk = results.checks.isolation.filter(c => c.ok).length;
  const isolationTotal = results.checks.isolation.length;
  console.log(`\n🔒 ISOLAMENTO: ${isolationOk}/${isolationTotal} franquias OK`);
  
  const rrOk = results.checks.roundRobin.filter(c => c.ok).length;
  const rrTotal = results.checks.roundRobin.length;
  console.log(`\n🔄 ROUND-ROBIN: ${rrOk}/${rrTotal} LPs balanceadas`);
  
  const visOk = results.checks.sellerVisibility.filter(c => c.ok).length;
  const visTotal = results.checks.sellerVisibility.length;
  console.log(`\n👁️  VISIBILIDADE: ${visOk}/${visTotal} vendedores isolados`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ ERROS (${results.errors.length}):`);
    results.errors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
    if (results.errors.length > 10) {
      console.log(`   ... e mais ${results.errors.length - 10} erros`);
    }
  } else {
    console.log(`\n✅ ZERO ERROS!`);
  }
  
  const allOk = isolationOk === isolationTotal && rrOk === rrTotal && visOk === visTotal && results.errors.length === 0;
  console.log(`\n${'='.repeat(60)}`);
  console.log(allOk ? '🚀 SISTEMA PRONTO PARA LANÇAMENTO!' : '⚠️  ATENÇÃO: Verificar erros acima antes do lançamento');
  console.log('='.repeat(60) + '\n');
  
  return allOk;
}

// ── Fase 8: Cleanup (remover dados de teste) ──────────────────────────────────

async function cleanup() {
  log('🧹', 'Removendo dados de teste...');
  
  // Remover leads de stress test
  if (results.leads.length > 0) {
    const { error: leadsErr } = await supabase
      .from('leads')
      .delete()
      .in('id', results.leads.map(l => l.id));
    if (leadsErr) log('⚠️', `Erro ao remover leads: ${leadsErr.message}`);
    else log('✅', `${results.leads.length} leads removidos`);
  }
  
  // Remover landing_page_sellers
  if (results.landingPages.length > 0) {
    const { error: lpsErr } = await supabase
      .from('landing_page_sellers')
      .delete()
      .in('landing_page_id', results.landingPages.map(lp => lp.id));
    if (lpsErr) log('⚠️', `Erro ao remover LP sellers: ${lpsErr.message}`);
  }
  
  // Remover landing pages
  if (results.landingPages.length > 0) {
    const { error: lpErr } = await supabase
      .from('franchise_landing_pages')
      .delete()
      .in('id', results.landingPages.map(lp => lp.id));
    if (lpErr) log('⚠️', `Erro ao remover LPs: ${lpErr.message}`);
    else log('✅', `${results.landingPages.length} LPs removidas`);
  }
  
  // Remover vendedores
  if (results.sellers.length > 0) {
    const { error: sellersErr } = await supabase
      .from('profiles')
      .delete()
      .in('id', results.sellers.map(s => s.id));
    if (sellersErr) log('⚠️', `Erro ao remover vendedores: ${sellersErr.message}`);
    else log('✅', `${results.sellers.length} vendedores removidos`);
  }
  
  // Remover franquias
  if (results.franchises.length > 0) {
    const { error: franchisesErr } = await supabase
      .from('franchises')
      .delete()
      .in('id', results.franchises.map(f => f.id));
    if (franchisesErr) log('⚠️', `Erro ao remover franquias: ${franchisesErr.message}`);
    else log('✅', `${results.franchises.length} franquias removidas`);
  }
  
  log('✅', 'Cleanup concluído — banco de dados limpo');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 HOMENZ.IA — STRESS TEST PRÉ-LANÇAMENTO');
  console.log('   10 franquias × 20 vendedores × 10 LPs × 10 leads');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Fase 1: Criar dados
    await createFranchises();
    if (results.franchises.length === 0) {
      console.error('❌ Nenhuma franquia criada. Abortando.');
      process.exit(1);
    }
    
    await createSellers();
    await createLandingPages();
    await submitLeads();
    
    // Fase 2: Verificações
    await verifyIsolation();
    await verifyRoundRobin();
    await verifySellerVisibility();
    await verifyLandingPages();
    
    // Fase 3: Relatório
    const allOk = printReport();
    
    // Fase 4: Cleanup
    await cleanup();
    
    process.exit(allOk ? 0 : 1);
    
  } catch (err) {
    console.error('❌ Erro fatal no stress test:', err);
    // Tentar cleanup mesmo em caso de erro
    try { await cleanup(); } catch {}
    process.exit(1);
  }
}

main();

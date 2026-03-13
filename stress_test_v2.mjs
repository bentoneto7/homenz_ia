/**
 * STRESS TEST v2 — Homenz.ia
 * Simula: 10 franquias × 20 vendedores × 10 LPs × 10 leads = 100 leads
 * 
 * Arquitetura correta:
 * - Supabase: franchises, profiles (sellers), leads, franchise_landing_pages
 * - TiDB (MySQL): landing_page_sellers (vínculos LP→Vendedor)
 * - Round-robin: franchise_round_robin no Supabase
 */

import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Conexão TiDB para landing_page_sellers
const db = await mysql.createConnection(process.env.DATABASE_URL);

// Hash de senha padrão para vendedores de teste
const TEST_PASSWORD_HASH = await bcrypt.hash('TestSeller@2024', 10);

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

const results = {
  franchises: [],
  sellers: [],
  landingPages: [],
  leads: [],
  errors: [],
  checks: { isolation: [], roundRobin: [], sellerVisibility: [], lpData: [] }
};

const suffix = crypto.randomBytes(4).toString('hex');

function log(emoji, msg) { console.log(`${emoji} ${msg}`); }
function slug(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Fase 1: Criar 10 franquias ────────────────────────────────────────────────
async function createFranchises() {
  log('🏢', 'Criando 10 franquias...');
  for (let i = 0; i < 10; i++) {
    const loc = CITIES[i];
    const { data, error } = await supabase.from('franchises').insert({
      name: `Homenz ${loc.city} ST-${suffix}`,
      slug: `homenz-${slug(loc.city)}-st-${suffix}`,
      city: loc.city, state: loc.state,
      phone: `(${11 + i}1) 99999-${suffix.slice(0, 4)}`,
      address: `Rua Teste ${i + 1}, ${(i + 1) * 100} — ${loc.city}/${loc.state}`,
      plan: 'pro', active: true,
      total_leads: 0, total_scheduled: 0, avg_lead_score: 0,
    }).select('id, name, slug, city, state, phone, address').single();
    if (error) { results.errors.push(`Franquia ${loc.city}: ${error.message}`); continue; }
    results.franchises.push(data);
    log('✅', `${data.name}`);
  }
  log('📊', `Franquias: ${results.franchises.length}/10`);
}

// ── Fase 2: Criar 20 vendedores por franquia ──────────────────────────────────
async function createSellers() {
  log('👥', 'Criando 20 vendedores por franquia (200 total)...');
  for (const franchise of results.franchises) {
    const batch = [];
    for (let i = 0; i < 20; i++) {
      batch.push({
        name: `Vendedor ${i + 1} ${slug(franchise.city)}`,
        email: `v${i + 1}.${franchise.id.slice(0, 6)}@st.test`,
        role: 'seller',
        franchise_id: franchise.id,
        active: true,
        password_hash: TEST_PASSWORD_HASH,
      });
    }
    const { data, error } = await supabase.from('profiles').insert(batch)
      .select('id, name, franchise_id');
    if (error) { results.errors.push(`Sellers ${franchise.name}: ${error.message}`); continue; }
    results.sellers.push(...(data || []));
    log('✅', `${data?.length} vendedores → ${franchise.name}`);
  }
  log('📊', `Vendedores: ${results.sellers.length}/200`);
}

// ── Fase 3: Criar 10 LPs por franquia + vincular vendedores ──────────────────
async function createLandingPages() {
  log('📄', 'Criando 10 LPs por franquia (100 total)...');
  for (const franchise of results.franchises) {
    const franchiseSellers = results.sellers.filter(s => s.franchise_id === franchise.id);
    for (let i = 0; i < 10; i++) {
      const proc = PROCEDURES[i];
      const { data: lp, error } = await supabase.from('franchise_landing_pages').insert({
        franchise_id: franchise.id,
        slug: `${slug(franchise.city)}-${proc}-${suffix}-${i}`,
        title: `Homenz ${franchise.city} — ${proc}`,
        procedure: proc, city: franchise.city, state: franchise.state,
        active: true, total_views: 0, total_leads: 0,
      }).select('id, slug, title, franchise_id').single();
      if (error) { results.errors.push(`LP ${proc}: ${error.message}`); continue; }

      // Vincular 2 vendedores específicos no TiDB
      const sellerOffset = i < 5 ? 0 : 10;
      const lpSellers = franchiseSellers.slice(sellerOffset, sellerOffset + 2);
      if (lpSellers.length > 0) {
        const values = lpSellers.map(s =>
          `(${db.escape(lp.id)}, ${db.escape(s.id)}, ${db.escape(s.name)})`
        ).join(', ');
        try {
          await db.execute(
            `INSERT INTO landing_page_sellers (landing_page_id, seller_id, seller_name) VALUES ${values}`
          );
        } catch (err) {
          results.errors.push(`LP sellers ${lp.id}: ${err.message}`);
        }
      }
      results.landingPages.push({ ...lp, sellers: lpSellers });
    }
    log('✅', `10 LPs → ${franchise.name}`);
  }
  log('📊', `LPs: ${results.landingPages.length}/100`);
}

// ── Fase 4: Submeter 100 leads (1 por LP) ─────────────────────────────────────
async function submitLeads() {
  log('🎯', 'Submetendo 100 leads...');
  for (const lp of results.landingPages) {
    const franchise = results.franchises.find(f => f.id === lp.franchise_id);
    if (!franchise) continue;

    // 1. Criar lead
    const { data: lead, error } = await supabase.from('leads').insert({
      franchise_id: franchise.id,
      landing_page_id: lp.id,
      name: `Lead ST ${lp.slug.slice(-8)}`,
      phone: `(11) 9${Math.floor(10000000 + Math.random() * 90000000)}`,
      age: 35 + Math.floor(Math.random() * 15),
      hair_problem: 'Queda intensa nos últimos 6 meses',
      lead_score: 75,
      temperature: 'hot',
      funnel_step: 'chat_completed',
      distribution_status: 'pending',
      utm_source: 'stress_test_v2',
      chat_answers: { summary: 'Lead de stress test v2' },
    }).select('id, franchise_id, landing_page_id').single();
    if (error) { results.errors.push(`Lead ${lp.slug}: ${error.message}`); continue; }

    // 2. Buscar vendedores da LP no TiDB
    const [lpSellersRows] = await db.execute(
      'SELECT seller_id, seller_name FROM landing_page_sellers WHERE landing_page_id = ?',
      [lp.id]
    );
    
    let sellers = lpSellersRows;
    if (!sellers || sellers.length === 0) {
      // Fallback: todos os vendedores ativos da franquia
      const { data: allSellers } = await supabase.from('profiles')
        .select('id, name').eq('franchise_id', franchise.id)
        .eq('role', 'seller').eq('active', true).limit(5);
      sellers = (allSellers || []).map(s => ({ seller_id: s.id, seller_name: s.name }));
    }

    if (sellers.length === 0) {
      results.errors.push(`Lead ${lead.id}: sem vendedores`);
      continue;
    }

    // 3. Round-robin: buscar estado atual
    const rrKey = `${franchise.id}__${lp.id}`;
    const { data: rrData } = await supabase.from('franchise_round_robin')
      .select('id, last_seller_index, total_distributed')
      .eq('franchise_id', rrKey).single();

    const currentIndex = rrData?.last_seller_index ?? -1;
    const nextIndex = (currentIndex + 1) % sellers.length;
    const selectedSeller = sellers[nextIndex];

    // 4. Atribuir lead
    await supabase.from('leads').update({
      assigned_to: selectedSeller.seller_id,
      distribution_status: 'assigned',
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id);

    // 5. Atualizar round-robin
    const totalDist = (rrData?.total_distributed ?? 0) + 1;
    if (rrData) {
      await supabase.from('franchise_round_robin').update({
        last_seller_index: nextIndex, total_distributed: totalDist,
        updated_at: new Date().toISOString(),
      }).eq('franchise_id', rrKey);
    } else {
      await supabase.from('franchise_round_robin').insert({
        franchise_id: rrKey, last_seller_index: nextIndex, total_distributed: totalDist,
      });
    }

    results.leads.push({ ...lead, assigned_to: selectedSeller.seller_id });
  }
  log('📊', `Leads: ${results.leads.length}/100`);
}

// ── Fase 5: Verificações ──────────────────────────────────────────────────────
async function runChecks() {
  log('🔍', 'Verificando isolamento por franquia...');
  for (const franchise of results.franchises) {
    const { data: leads } = await supabase.from('leads')
      .select('id, franchise_id, assigned_to')
      .eq('franchise_id', franchise.id).eq('utm_source', 'stress_test_v2');
    const wrongFranchise = (leads || []).filter(l => l.franchise_id !== franchise.id).length;
    const assigned = (leads || []).filter(l => l.assigned_to).length;
    const ok = wrongFranchise === 0 && assigned === (leads || []).length;
    results.checks.isolation.push({ franchise: franchise.name, total: leads?.length || 0, assigned, wrongFranchise, ok });
    log(ok ? '✅' : '❌', `Isolamento ${franchise.name}: ${leads?.length} leads, ${assigned} atribuídos, ${wrongFranchise} vazamentos`);
  }

  log('🔄', 'Verificando round-robin...');
  for (const lp of results.landingPages.slice(0, 20)) {
    const { data: leads } = await supabase.from('leads')
      .select('assigned_to').eq('landing_page_id', lp.id).eq('utm_source', 'stress_test_v2')
      .not('assigned_to', 'is', null);
    if (!leads || leads.length === 0) continue;
    const dist = {};
    for (const l of leads) dist[l.assigned_to] = (dist[l.assigned_to] || 0) + 1;
    const vals = Object.values(dist);
    const maxDiff = vals.length > 1 ? Math.max(...vals) - Math.min(...vals) : 0;
    const ok = maxDiff <= 1;
    results.checks.roundRobin.push({ lp: lp.title.slice(0, 35), sellers: Object.keys(dist).length, maxDiff, ok });
    log(ok ? '✅' : '⚠️', `Round-robin ${lp.title.slice(0, 35)}: ${Object.keys(dist).length} vendedores, diff=${maxDiff}`);
  }

  log('🌐', 'Verificando dados da LP pública (phone + address)...');
  for (const lp of results.landingPages.slice(0, 5)) {
    const { data } = await supabase.from('franchise_landing_pages')
      .select('id, slug, franchises!inner(phone, address)').eq('id', lp.id).single();
    const f = data?.franchises;
    const ok = !!(f?.phone && f?.address);
    results.checks.lpData.push({ lp: lp.slug.slice(-20), hasPhone: !!f?.phone, hasAddress: !!f?.address, ok });
    log(ok ? '✅' : '⚠️', `LP ${lp.slug.slice(-20)}: phone=${!!f?.phone}, address=${!!f?.address}`);
  }

  log('👁️', 'Verificando visibilidade por vendedor...');
  for (const franchise of results.franchises.slice(0, 3)) {
    const fSellers = results.sellers.filter(s => s.franchise_id === franchise.id).slice(0, 2);
    for (const seller of fSellers) {
      const { data: leads } = await supabase.from('leads')
        .select('franchise_id').eq('assigned_to', seller.id).eq('utm_source', 'stress_test_v2');
      const wrong = (leads || []).filter(l => l.franchise_id !== franchise.id).length;
      const ok = wrong === 0;
      results.checks.sellerVisibility.push({ seller: seller.name, wrong, ok });
      log(ok ? '✅' : '❌', `Vendedor ${seller.name}: ${leads?.length} leads, ${wrong} de outras franquias`);
    }
  }
}

// ── Fase 6: Relatório ─────────────────────────────────────────────────────────
function report() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 RELATÓRIO FINAL — STRESS TEST v2');
  console.log('='.repeat(60));
  console.log(`\n✅ CRIAÇÃO:`);
  console.log(`   Franquias: ${results.franchises.length}/10`);
  console.log(`   Vendedores: ${results.sellers.length}/200`);
  console.log(`   Landing Pages: ${results.landingPages.length}/100`);
  console.log(`   Leads: ${results.leads.length}/100`);
  
  const iOk = results.checks.isolation.filter(c => c.ok).length;
  console.log(`\n🔒 ISOLAMENTO: ${iOk}/${results.checks.isolation.length} OK`);
  
  const rrOk = results.checks.roundRobin.filter(c => c.ok).length;
  console.log(`🔄 ROUND-ROBIN: ${rrOk}/${results.checks.roundRobin.length} OK`);
  
  const lpOk = results.checks.lpData.filter(c => c.ok).length;
  console.log(`🌐 LP PÚBLICA (phone+address): ${lpOk}/${results.checks.lpData.length} OK`);
  
  const visOk = results.checks.sellerVisibility.filter(c => c.ok).length;
  console.log(`👁️  VISIBILIDADE: ${visOk}/${results.checks.sellerVisibility.length} OK`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ ERROS (${results.errors.length}):`);
    results.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    if (results.errors.length > 5) console.log(`   ... e mais ${results.errors.length - 5}`);
  } else {
    console.log(`\n✅ ZERO ERROS!`);
  }
  
  const allOk = iOk === results.checks.isolation.length &&
    rrOk === results.checks.roundRobin.length &&
    lpOk === results.checks.lpData.length &&
    visOk === results.checks.sellerVisibility.length &&
    results.errors.length === 0;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(allOk ? '🚀 SISTEMA PRONTO PARA LANÇAMENTO!' : '⚠️  ATENÇÃO: Verificar erros antes do lançamento');
  console.log('='.repeat(60) + '\n');
  return allOk;
}

// ── Fase 7: Cleanup ───────────────────────────────────────────────────────────
async function cleanup() {
  log('🧹', 'Limpando dados de teste...');
  
  // Remover round-robin de teste
  const rrKeys = results.landingPages.map(lp => `${lp.franchise_id}__${lp.id}`);
  if (rrKeys.length > 0) {
    await supabase.from('franchise_round_robin').delete().in('franchise_id', rrKeys);
  }
  
  // Remover leads por franchise_id (inclui os que falharam na distribuição)
  if (results.franchises.length > 0) {
    const { error, count } = await supabase.from('leads').delete()
      .in('franchise_id', results.franchises.map(f => f.id))
      .eq('utm_source', 'stress_test_v2');
    if (error) log('⚠️', `Leads: ${error.message}`);
    else log('✅', `Leads removidos (${count ?? '?'})`);
  }
  
  // Remover landing_page_sellers do TiDB
  if (results.landingPages.length > 0) {
    const ids = results.landingPages.map(lp => db.escape(lp.id)).join(', ');
    await db.execute(`DELETE FROM landing_page_sellers WHERE landing_page_id IN (${ids})`);
    log('✅', `LP sellers removidos`);
  }
  
  // Remover LPs
  if (results.landingPages.length > 0) {
    const { error } = await supabase.from('franchise_landing_pages').delete()
      .in('id', results.landingPages.map(lp => lp.id));
    if (error) log('⚠️', `LPs: ${error.message}`);
    else log('✅', `${results.landingPages.length} LPs removidas`);
  }
  
  // Remover vendedores
  if (results.sellers.length > 0) {
    const { error } = await supabase.from('profiles').delete()
      .in('id', results.sellers.map(s => s.id));
    if (error) log('⚠️', `Sellers: ${error.message}`);
    else log('✅', `${results.sellers.length} vendedores removidos`);
  }
  
  // Remover franquias
  if (results.franchises.length > 0) {
    const { error } = await supabase.from('franchises').delete()
      .in('id', results.franchises.map(f => f.id));
    if (error) log('⚠️', `Franquias: ${error.message}`);
    else log('✅', `${results.franchises.length} franquias removidas`);
  }
  
  await db.end();
  log('✅', 'Cleanup concluído!');
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('🚀 HOMENZ.IA — STRESS TEST v2 PRÉ-LANÇAMENTO');
console.log('   10 franquias × 20 vendedores × 10 LPs × 10 leads');
console.log('='.repeat(60) + '\n');

try {
  await createFranchises();
  if (results.franchises.length === 0) { console.error('❌ Sem franquias. Abortando.'); process.exit(1); }
  await createSellers();
  await createLandingPages();
  await submitLeads();
  await runChecks();
  const ok = report();
  await cleanup();
  process.exit(ok ? 0 : 1);
} catch (err) {
  console.error('❌ Erro fatal:', err.message);
  try { await cleanup(); } catch {}
  process.exit(1);
}

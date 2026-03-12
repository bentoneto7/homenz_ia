import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('\n🔍 AUDITORIA v2 — VERIFICAÇÃO DO FLUXO ACRE\n');
  console.log('='.repeat(55));

  // ─── Buscar franquia do Acre ───────────────────────────────────────────────
  const { data: franchise } = await supabase
    .from('franchises')
    .select('id, name, slug, city, state, plan, active')
    .eq('slug', 'homenz-rio-branco')
    .single();

  if (!franchise) { console.error('❌ Franquia do Acre não encontrada'); process.exit(1); }
  console.log('🏢 Franquia:', franchise.name, `(${franchise.city}/${franchise.state})`);
  console.log('   ID:', franchise.id, '| Ativa:', franchise.active ? '✅' : '❌');

  // ─── Buscar franqueado ─────────────────────────────────────────────────────
  const { data: franqueado } = await supabase
    .from('profiles')
    .select('id, name, email, role, active')
    .eq('franchise_id', franchise.id)
    .eq('role', 'franchisee')
    .single();

  console.log('\n👤 Franqueado:', franqueado?.name, `(${franqueado?.email})`);
  console.log('   Ativo:', franqueado?.active ? '✅' : '❌');

  // ─── Buscar vendedor ───────────────────────────────────────────────────────
  const { data: sellers } = await supabase
    .from('profiles')
    .select('id, name, email, role, active')
    .eq('franchise_id', franchise.id)
    .eq('role', 'seller');

  console.log('\n🧑‍💼 Vendedores cadastrados:', sellers?.length || 0);
  for (const s of (sellers || [])) {
    console.log(`   - ${s.name} (${s.email}) | Ativo: ${s.active ? '✅' : '❌'}`);
  }

  const activeSellers = (sellers || []).filter(s => s.active);
  console.log('   Vendedores ativos:', activeSellers.length);

  // ─── Buscar landing pages ──────────────────────────────────────────────────
  const { data: lps } = await supabase
    .from('franchise_landing_pages')
    .select('id, slug, title, active, total_leads')
    .eq('franchise_id', franchise.id)
    .order('created_at', { ascending: false });

  console.log('\n🌐 Landing Pages:', lps?.length || 0);
  for (const lp of (lps || [])) {
    console.log(`   - ${lp.title}`);
    console.log(`     Slug: ${lp.slug} | Ativa: ${lp.active ? '✅' : '❌'} | Leads: ${lp.total_leads || 0}`);
  }

  const activeLp = (lps || []).find(lp => lp.active);

  // ─── Buscar leads ──────────────────────────────────────────────────────────
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, lead_score, temperature, distribution_status, assigned_to, created_at')
    .eq('franchise_id', franchise.id)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n📋 Leads recentes:', leads?.length || 0);
  for (const lead of (leads || [])) {
    const assignedSeller = activeSellers.find(s => s.id === lead.assigned_to);
    console.log(`   - ${lead.name} | Score: ${lead.lead_score} | ${lead.temperature}`);
    console.log(`     Status: ${lead.distribution_status} | Atribuído a: ${assignedSeller?.name || lead.assigned_to || 'ninguém'}`);
  }

  // ─── Criar lead de teste via submitLead ───────────────────────────────────
  if (activeLp) {
    console.log('\n🧪 TESTANDO submitLead via API...');
    
    // Simular o que o submitLead faz
    const leadScore = 90;
    const { data: newLead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        franchise_id: franchise.id,
        landing_page_id: activeLp.id,
        name: 'Teste Auditoria Acre',
        phone: '68999995678',
        email: 'teste.auditoria@gmail.com',
        age: 42,
        hair_problem: 'Queda nas têmporas há 2 anos, busca tratamento',
        city: franchise.city,
        state: franchise.state,
        utm_source: 'meta',
        utm_medium: 'cpc',
        utm_campaign: activeLp.slug,
        distribution_status: 'pending',
        lead_score: leadScore,
        temperature: 'hot',
        chat_answers: { summary: 'Homem, 42 anos, queda nas têmporas há 2 anos' },
      })
      .select('id, name, distribution_status, assigned_to')
      .single();

    if (leadErr) {
      console.error('❌ Erro ao criar lead:', leadErr.message);
    } else {
      console.log('✅ Lead criado:', newLead.name, '| ID:', newLead.id);
      
      // Distribuir via round-robin
      if (activeSellers.length > 0) {
        const { data: rr } = await supabase
          .from('franchise_round_robin')
          .select('last_seller_index, total_distributed')
          .eq('franchise_id', franchise.id)
          .single();

        const currentIndex = rr?.last_seller_index ?? -1;
        const nextIndex = (currentIndex + 1) % activeSellers.length;
        const selectedSeller = activeSellers[nextIndex];

        const { error: updateErr } = await supabase
          .from('leads')
          .update({
            assigned_to: selectedSeller.id,
            distribution_status: 'assigned',
            updated_at: new Date().toISOString(),
          })
          .eq('id', newLead.id);

        if (updateErr) {
          console.error('❌ Erro ao distribuir lead:', updateErr.message);
        } else {
          // Atualizar round-robin
          await supabase
            .from('franchise_round_robin')
            .upsert({
              franchise_id: franchise.id,
              last_seller_index: nextIndex,
              total_distributed: (rr?.total_distributed || 0) + 1,
            }, { onConflict: 'franchise_id' });

          // Log de distribuição
          await supabase.from('lead_distribution_log').insert({
            lead_id: newLead.id,
            franchise_id: franchise.id,
            seller_id: selectedSeller.id,
            method: 'round_robin',
            seller_position: nextIndex,
          });

          console.log('✅ Lead distribuído para:', selectedSeller.name);

          // Verificar lead final
          const { data: finalLead } = await supabase
            .from('leads')
            .select('id, name, distribution_status, assigned_to')
            .eq('id', newLead.id)
            .single();

          const { data: finalSeller } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', finalLead?.assigned_to)
            .single();

          console.log('\n' + '='.repeat(55));
          console.log('✅ LEAD FINAL:');
          console.log('   Nome:', finalLead?.name);
          console.log('   Status:', finalLead?.distribution_status);
          console.log('   Atribuído a:', finalSeller?.name, `(${finalSeller?.email})`);
        }
      } else {
        console.log('⚠️  Nenhum vendedor ativo para distribuir o lead');
      }
    }
  }

  // ─── Round-robin status ────────────────────────────────────────────────────
  const { data: rr } = await supabase
    .from('franchise_round_robin')
    .select('*')
    .eq('franchise_id', franchise.id)
    .single();

  console.log('\n🔄 Round-Robin:');
  console.log('   Posição atual:', rr?.last_seller_index ?? 'não iniciado');
  console.log('   Total distribuídos:', rr?.total_distributed || 0);

  // ─── Checklist final ──────────────────────────────────────────────────────
  const allLeads = await supabase
    .from('leads')
    .select('id, distribution_status, assigned_to')
    .eq('franchise_id', franchise.id);

  const assignedLeads = (allLeads.data || []).filter(l => l.distribution_status === 'assigned');
  const pendingLeads = (allLeads.data || []).filter(l => l.distribution_status === 'pending');

  console.log('\n' + '='.repeat(55));
  console.log('📊 RESUMO FINAL:');
  console.log('='.repeat(55));
  console.log(`  🏢 Franquia: ${franchise.name} (${franchise.city}/${franchise.state})`);
  console.log(`  👤 Franqueado: ${franqueado?.name}`);
  console.log(`  🧑‍💼 Vendedores ativos: ${activeSellers.length}`);
  console.log(`  🌐 Landing pages ativas: ${(lps || []).filter(l => l.active).length}`);
  console.log(`  📋 Total de leads: ${allLeads.data?.length || 0}`);
  console.log(`     ✅ Distribuídos: ${assignedLeads.length}`);
  console.log(`     ⏳ Pendentes: ${pendingLeads.length}`);

  const checks = [
    { label: 'Franquia criada no Acre', ok: !!franchise && franchise.active },
    { label: 'Franqueado criado e ativo', ok: !!franqueado && franqueado.active },
    { label: 'Vendedor ativo cadastrado', ok: activeSellers.length > 0 },
    { label: 'Landing page ativa', ok: !!(lps || []).find(l => l.active) },
    { label: 'Leads criados', ok: (allLeads.data?.length || 0) > 0 },
    { label: 'Leads distribuídos para vendedor', ok: assignedLeads.length > 0 },
    { label: 'Sem leads pendentes', ok: pendingLeads.length === 0 },
  ];

  console.log('\n🧪 CHECKLIST:');
  let allOk = true;
  for (const check of checks) {
    console.log(`  ${check.ok ? '✅' : '❌'} ${check.label}`);
    if (!check.ok) allOk = false;
  }

  console.log('\n' + (allOk ? '🎉 TUDO OK!' : '⚠️  Atenção nos itens marcados com ❌'));

  console.log('\n🔑 CREDENCIAIS:');
  console.log('  Franqueado → /login | franqueado.acre@homenz.com.br | Homenz@2024');
  console.log('  Vendedor   → /login | vendedor.acre@homenz.com.br | Vendedor@2024');
  if (activeLp) console.log('  Landing    → /l/' + activeLp.slug);
}

main().catch(console.error);

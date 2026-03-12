import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_KEY não definidos');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Hash simples de senha (bcrypt seria ideal, mas usamos sha256 para o script)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'homenz_salt_2024').digest('hex');
}

async function main() {
  console.log('\n🔍 AUDITORIA COMPLETA — FLUXO ACRE\n');
  console.log('='.repeat(50));

  // ─── PASSO 1: Criar franquia no Acre ───────────────────────────────────────
  console.log('\n📍 PASSO 1: Criando franquia no Acre...');
  
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 15);
  
  const { data: franchise, error: franchiseErr } = await supabase
    .from('franchises')
    .insert({
      name: 'Homenz Rio Branco',
      slug: 'homenz-rio-branco',
      city: 'Rio Branco',
      state: 'AC',
      plan: 'starter',
      active: true,
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select('id, name, slug, city, state, plan')
    .single();

  if (franchiseErr) {
    // Verificar se já existe
    if (franchiseErr.code === '23505') {
      console.log('⚠️  Franquia já existe, buscando...');
      const { data: existing } = await supabase
        .from('franchises')
        .select('id, name, slug, city, state, plan')
        .eq('slug', 'homenz-rio-branco')
        .single();
      if (!existing) { console.error('❌ Erro:', franchiseErr.message); process.exit(1); }
      console.log('✅ Franquia encontrada:', existing.name, `(${existing.city}/${existing.state})`);
      return await continueWithFranchise(existing, supabase, hashPassword);
    }
    console.error('❌ Erro ao criar franquia:', franchiseErr.message);
    process.exit(1);
  }

  console.log('✅ Franquia criada:', franchise.name, `(${franchise.city}/${franchise.state})`);
  console.log('   ID:', franchise.id);
  console.log('   Slug:', franchise.slug);
  console.log('   Plano:', franchise.plan);

  await continueWithFranchise(franchise, supabase, hashPassword);
}

async function continueWithFranchise(franchise, supabase, hashPassword) {
  // ─── PASSO 2: Criar franqueado ─────────────────────────────────────────────
  console.log('\n👤 PASSO 2: Criando franqueado...');
  
  const franchiseeEmail = 'franqueado.acre@homenz.com.br';
  const { data: existingFranch } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('email', franchiseeEmail)
    .single();
  
  let franqueado = existingFranch;
  if (!existingFranch) {
    const { data: newFranch, error: franchErr } = await supabase
      .from('profiles')
      .insert({
        name: 'Carlos Mendes',
        email: franchiseeEmail,
        password_hash: hashPassword('Homenz@2024'),
        role: 'franchisee',
        franchise_id: franchise.id,
        phone: '68999990001',
        active: true,
      })
      .select('id, name, email, role')
      .single();
    
    if (franchErr) { console.error('❌ Erro ao criar franqueado:', franchErr.message); process.exit(1); }
    franqueado = newFranch;
    
    // Atualizar owner_id da franquia
    await supabase.from('franchises').update({ owner_id: franqueado.id }).eq('id', franchise.id);
    console.log('✅ Franqueado criado:', franqueado.name, `(${franqueado.email})`);
  } else {
    console.log('✅ Franqueado já existe:', franqueado.name, `(${franqueado.email})`);
  }

  // ─── PASSO 3: Criar vendedor ───────────────────────────────────────────────
  console.log('\n🧑‍💼 PASSO 3: Criando vendedor...');
  
  const sellerEmail = 'vendedor.acre@homenz.com.br';
  const { data: existingSeller } = await supabase
    .from('profiles')
    .select('id, name, email, role, active')
    .eq('email', sellerEmail)
    .single();
  
  let seller = existingSeller;
  if (!existingSeller) {
    const { data: newSeller, error: sellerErr } = await supabase
      .from('profiles')
      .insert({
        name: 'Ana Lima',
        email: sellerEmail,
        password_hash: hashPassword('Vendedor@2024'),
        role: 'seller',
        franchise_id: franchise.id,
        phone: '68999990002',
        active: true,
      })
      .select('id, name, email, role, active')
      .single();
    
    if (sellerErr) { console.error('❌ Erro ao criar vendedor:', sellerErr.message); process.exit(1); }
    seller = newSeller;
    console.log('✅ Vendedor criado:', seller.name, `(${seller.email})`);
  } else {
    console.log('✅ Vendedor já existe:', seller.name, `(${seller.email})`);
    console.log('   Ativo:', seller.active ? '✅' : '❌');
    if (!seller.active) {
      await supabase.from('profiles').update({ active: true }).eq('id', seller.id);
      console.log('   → Ativado!');
    }
  }

  // ─── PASSO 4: Criar landing page ──────────────────────────────────────────
  console.log('\n🌐 PASSO 4: Criando landing page...');
  
  const lpSlug = `homenz-rio-branco-crescimento-capilar-${Date.now().toString(36)}`;
  const { data: lp, error: lpErr } = await supabase
    .from('franchise_landing_pages')
    .insert({
      franchise_id: franchise.id,
      slug: lpSlug,
      title: 'Avaliação Capilar Gratuita — Rio Branco/AC',
      procedure: 'crescimento-capilar',
      city: franchise.city,
      state: franchise.state,
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: lpSlug,
      active: true,
      total_leads: 0,
      total_views: 0,
    })
    .select('id, slug, title, active')
    .single();
  
  if (lpErr) { console.error('❌ Erro ao criar landing page:', lpErr.message); process.exit(1); }
  console.log('✅ Landing page criada:', lp.title);
  console.log('   Slug:', lp.slug);
  console.log('   URL: /l/' + lp.slug);

  // ─── PASSO 5: Verificar round-robin ───────────────────────────────────────
  console.log('\n🔄 PASSO 5: Verificando round-robin...');
  
  const { data: rr } = await supabase
    .from('franchise_round_robin')
    .select('*')
    .eq('franchise_id', franchise.id)
    .single();
  
  if (!rr) {
    const { error: rrErr } = await supabase
      .from('franchise_round_robin')
      .insert({ franchise_id: franchise.id, last_seller_index: -1, total_distributed: 0 });
    if (rrErr) console.log('   ⚠️  Round-robin não criado:', rrErr.message);
    else console.log('✅ Round-robin inicializado');
  } else {
    console.log('✅ Round-robin existente:', `posição ${rr.last_seller_index}, ${rr.total_distributed} distribuídos`);
  }

  // ─── PASSO 6: Gerar lead de teste ─────────────────────────────────────────
  console.log('\n📋 PASSO 6: Gerando lead de teste...');
  
  const leadScore = 85; // alta intenção
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .insert({
      franchise_id: franchise.id,
      landing_page_id: lp.id,
      name: 'João da Silva',
      phone: '68999991234',
      email: 'joao.silva.teste@gmail.com',
      age: 38,
      hair_problem: 'Queda intensa nas têmporas e topo da cabeça há 3 anos',
      city: franchise.city,
      state: franchise.state,
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: lpSlug,
      distribution_status: 'pending',
      lead_score: leadScore,
      temperature: 'hot',
      chat_answers: { summary: 'Homem, 38 anos, queda intensa há 3 anos, muito interessado em tratamento' },
    })
    .select('id, name, phone, lead_score, temperature, distribution_status')
    .single();
  
  if (leadErr) { console.error('❌ Erro ao criar lead:', leadErr.message); process.exit(1); }
  console.log('✅ Lead criado:', lead.name);
  console.log('   ID:', lead.id);
  console.log('   Score:', lead.lead_score, '| Temperatura:', lead.temperature);
  console.log('   Status distribuição:', lead.distribution_status);

  // ─── PASSO 7: Distribuir lead via round-robin ──────────────────────────────
  console.log('\n🎯 PASSO 7: Distribuindo lead via round-robin...');
  
  // Buscar vendedores ativos
  const { data: sellers } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('franchise_id', franchise.id)
    .eq('role', 'seller')
    .eq('active', true);
  
  console.log('   Vendedores ativos:', sellers?.length || 0);
  
  if (!sellers || sellers.length === 0) {
    console.error('❌ Nenhum vendedor ativo encontrado! Lead não pode ser distribuído.');
    process.exit(1);
  }
  
  // Buscar/criar round-robin
  const { data: rrCurrent } = await supabase
    .from('franchise_round_robin')
    .select('last_seller_index, total_distributed')
    .eq('franchise_id', franchise.id)
    .single();
  
  const currentIndex = rrCurrent?.last_seller_index ?? -1;
  const nextIndex = (currentIndex + 1) % sellers.length;
  const selectedSeller = sellers[nextIndex];
  
  console.log('   Próximo vendedor (índice', nextIndex, '):', selectedSeller.name);
  
  // Atualizar lead com seller_id
  const { error: updateErr } = await supabase
    .from('leads')
    .update({ 
      seller_id: selectedSeller.id,
      distribution_status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', lead.id);
  
  if (updateErr) { console.error('❌ Erro ao atribuir lead:', updateErr.message); }
  else console.log('✅ Lead atribuído ao vendedor:', selectedSeller.name);
  
  // Atualizar round-robin
  await supabase
    .from('franchise_round_robin')
    .upsert({ 
      franchise_id: franchise.id, 
      last_seller_index: nextIndex,
      total_distributed: (rrCurrent?.total_distributed || 0) + 1,
    }, { onConflict: 'franchise_id' });
  
  // Registrar log de distribuição
  await supabase
    .from('lead_distribution_log')
    .insert({
      lead_id: lead.id,
      franchise_id: franchise.id,
      seller_id: selectedSeller.id,
      method: 'round_robin',
      seller_index: nextIndex,
    });
  
  console.log('✅ Log de distribuição registrado');

  // ─── PASSO 8: Verificar resultado final ───────────────────────────────────
  console.log('\n✅ PASSO 8: Verificando resultado final...');
  
  const { data: finalLead } = await supabase
    .from('leads')
    .select('id, name, phone, lead_score, temperature, distribution_status, seller_id')
    .eq('id', lead.id)
    .single();
  
  const { data: finalSeller } = await supabase
    .from('profiles')
    .select('id, name, email, role, franchise_id')
    .eq('id', finalLead?.seller_id)
    .single();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTADO DA AUDITORIA:');
  console.log('='.repeat(50));
  console.log('🏢 Franquia:', franchise.name, `(${franchise.city}/${franchise.state})`);
  console.log('👤 Franqueado:', franqueado.name, `(${franqueado.email})`);
  console.log('🧑‍💼 Vendedor:', seller.name, `(${seller.email})`);
  console.log('🌐 Landing Page:', lp.title);
  console.log('   URL: /l/' + lp.slug);
  console.log('📋 Lead:', finalLead?.name, `| Score: ${finalLead?.lead_score} | ${finalLead?.temperature}`);
  console.log('   Status:', finalLead?.distribution_status);
  console.log('   Atribuído a:', finalSeller?.name, `(${finalSeller?.email})`);
  console.log('='.repeat(50));
  
  // Verificações
  const checks = [
    { label: 'Franquia criada no Acre', ok: !!franchise },
    { label: 'Franqueado criado', ok: !!franqueado },
    { label: 'Vendedor criado e ativo', ok: !!seller && seller.active !== false },
    { label: 'Landing page criada', ok: !!lp && lp.active },
    { label: 'Lead gerado', ok: !!finalLead },
    { label: 'Lead distribuído (status=assigned)', ok: finalLead?.distribution_status === 'assigned' },
    { label: 'Lead atribuído ao vendedor correto', ok: finalLead?.seller_id === seller.id },
  ];
  
  console.log('\n🧪 CHECKLIST:');
  let allOk = true;
  for (const check of checks) {
    console.log(`  ${check.ok ? '✅' : '❌'} ${check.label}`);
    if (!check.ok) allOk = false;
  }
  
  console.log('\n' + (allOk ? '🎉 TUDO OK! Fluxo completo funcionando.' : '⚠️  Alguns itens precisam de atenção.'));
  
  // Credenciais de acesso
  console.log('\n🔑 CREDENCIAIS DE ACESSO:');
  console.log('  Login do franqueado: /login');
  console.log('  Email:', franqueado.email);
  console.log('  Senha: Homenz@2024');
  console.log('  Login do vendedor: /login');
  console.log('  Email:', seller.email);
  console.log('  Senha: Vendedor@2024');
  console.log('  Landing page: /l/' + lp.slug);
}

main().catch(console.error);

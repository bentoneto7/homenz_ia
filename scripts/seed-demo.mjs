/**
 * Seed de dados demo para o acesso de demonstração do sistema Homenz.
 * Insere: leads, agendamentos e landing page para a franquia Homenz Uberaba.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FRANCHISE_ID = 'b0000000-0000-0000-0000-000000000001'; // Homenz Uberaba
const SELLER_CARLOS = 'a0000000-0000-0000-0000-000000000003';
const SELLER_ANA    = 'a0000000-0000-0000-0000-000000000004';
const SELLER_RAFAEL = 'a0000000-0000-0000-0000-000000000005';

// ── 1. Limpar dados demo anteriores ─────────────────────────────────────────
async function cleanDemo() {
  await sb.from('appointments').delete().eq('franchise_id', FRANCHISE_ID);
  await sb.from('leads').delete().eq('franchise_id', FRANCHISE_ID);
  await sb.from('franchise_landing_pages').delete().eq('franchise_id', FRANCHISE_ID);
  console.log('✅ Dados demo anteriores removidos');
}

// ── 2. Criar landing page demo ───────────────────────────────────────────────
async function seedLandingPages() {
  const { data, error } = await sb.from('franchise_landing_pages').insert([
    {
      franchise_id: FRANCHISE_ID,
      slug: 'uberaba-demo',
      title: 'Diagnóstico Capilar Gratuito — Uberaba',
      procedure: 'preenchimento_capilar',
      city: 'Uberaba',
      state: 'MG',
      active: true,
      total_views: 342,
      total_leads: 28,
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: 'demo-uberaba',
    },
    {
      franchise_id: FRANCHISE_ID,
      slug: 'uberaba-google',
      title: 'Calvície Tem Solução — Uberaba',
      procedure: 'micropigmentacao',
      city: 'Uberaba',
      state: 'MG',
      active: true,
      total_views: 189,
      total_leads: 14,
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'calvicie-uberaba',
    },
  ]).select();
  if (error) { console.error('❌ LP error:', error.message); return []; }
  console.log(`✅ ${data.length} landing pages criadas`);
  return data;
}

// ── 3. Criar leads demo ──────────────────────────────────────────────────────
async function seedLeads(lpId) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const leads = [
    // Leads quentes (novos, alta pontuação)
    { name: 'Marcos Oliveira',  phone: '34991110001', email: 'marcos.oliveira@email.com',  age: 34, gender: 'male', hair_problem: 'Queda de cabelo',       hair_loss_type: 'vertex',   lead_score: 88, temperature: 'hot',  funnel_step: 'ai_ready',       assigned_to: SELLER_CARLOS, landing_page_id: lpId, created_at: new Date(now - 2*60*60*1000).toISOString(), last_activity_at: new Date(now - 30*60*1000).toISOString() },
    { name: 'Diego Ferreira',   phone: '34992220002', email: 'diego.ferreira@email.com',   age: 41, gender: 'male', hair_problem: 'Calvície progressiva',   hair_loss_type: 'frontal',  lead_score: 75, temperature: 'hot',  funnel_step: 'photos_uploaded', assigned_to: SELLER_ANA,    landing_page_id: lpId, created_at: new Date(now - 4*60*60*1000).toISOString(), last_activity_at: new Date(now - 1*60*60*1000).toISOString() },
    { name: 'Thiago Almeida',   phone: '34993330003', email: 'thiago.almeida@email.com',   age: 29, gender: 'male', hair_problem: 'Rarefacção capilar',     hair_loss_type: 'diffuse',  lead_score: 62, temperature: 'hot',  funnel_step: 'chat_completed',  assigned_to: SELLER_RAFAEL, landing_page_id: lpId, created_at: new Date(now - 6*60*60*1000).toISOString(), last_activity_at: new Date(now - 2*60*60*1000).toISOString() },
    // Leads mornos (1-2 dias)
    { name: 'Bruno Santos',     phone: '34994440004', email: 'bruno.santos@email.com',     age: 38, gender: 'male', hair_problem: 'Entradas na testa',      hair_loss_type: 'temporal', lead_score: 55, temperature: 'warm', funnel_step: 'ai_ready',       assigned_to: SELLER_CARLOS, landing_page_id: lpId, created_at: new Date(now - 1*day).toISOString(), last_activity_at: new Date(now - 18*60*60*1000).toISOString() },
    { name: 'Leandro Costa',    phone: '34995550005', email: 'leandro.costa@email.com',    age: 45, gender: 'male', hair_problem: 'Calvície progressiva',   hair_loss_type: 'total',    lead_score: 71, temperature: 'warm', funnel_step: 'scheduled',       assigned_to: SELLER_ANA,    landing_page_id: lpId, created_at: new Date(now - 1.5*day).toISOString(), last_activity_at: new Date(now - 1*day).toISOString() },
    { name: 'Felipe Rodrigues', phone: '34996660006', email: 'felipe.rodrigues@email.com', age: 32, gender: 'male', hair_problem: 'Queda de cabelo',       hair_loss_type: 'frontal',  lead_score: 48, temperature: 'warm', funnel_step: 'chat_completed',  assigned_to: SELLER_RAFAEL, landing_page_id: lpId, created_at: new Date(now - 2*day).toISOString(), last_activity_at: new Date(now - 1.5*day).toISOString() },
    // Leads frios (3+ dias)
    { name: 'Anderson Lima',    phone: '34997770007', email: 'anderson.lima@email.com',    age: 52, gender: 'male', hair_problem: 'Calvície progressiva',   hair_loss_type: 'vertex',   lead_score: 83, temperature: 'cold', funnel_step: 'ai_ready',       assigned_to: SELLER_CARLOS, landing_page_id: lpId, created_at: new Date(now - 4*day).toISOString(), last_activity_at: new Date(now - 3*day).toISOString() },
    { name: 'Ricardo Pereira',  phone: '34998880008', email: 'ricardo.pereira@email.com',  age: 27, gender: 'male', hair_problem: 'Rarefacção capilar',     hair_loss_type: 'diffuse',  lead_score: 39, temperature: 'cold', funnel_step: 'chat_started',    assigned_to: SELLER_ANA,    landing_page_id: lpId, created_at: new Date(now - 5*day).toISOString(), last_activity_at: new Date(now - 4*day).toISOString() },
    { name: 'Gustavo Martins',  phone: '34999990009', email: 'gustavo.martins@email.com',  age: 36, gender: 'male', hair_problem: 'Falhas no couro cabeludo', hair_loss_type: 'vertex', lead_score: 60, temperature: 'cold', funnel_step: 'photos_uploaded', assigned_to: SELLER_RAFAEL, landing_page_id: lpId, created_at: new Date(now - 6*day).toISOString(), last_activity_at: new Date(now - 5*day).toISOString() },
    // Leads convertidos
    { name: 'Paulo Nascimento', phone: '34911110010', email: 'paulo.nascimento@email.com', age: 43, gender: 'male', hair_problem: 'Calvície progressiva',   hair_loss_type: 'frontal',  lead_score: 92, temperature: 'hot',  funnel_step: 'completed',       assigned_to: SELLER_CARLOS, landing_page_id: lpId, created_at: new Date(now - 8*day).toISOString(), last_activity_at: new Date(now - 7*day).toISOString() },
    { name: 'Henrique Souza',   phone: '34922220011', email: 'henrique.souza@email.com',   age: 31, gender: 'male', hair_problem: 'Queda de cabelo',       hair_loss_type: 'temporal', lead_score: 77, temperature: 'warm', funnel_step: 'completed',       assigned_to: SELLER_ANA,    landing_page_id: lpId, created_at: new Date(now - 10*day).toISOString(), last_activity_at: new Date(now - 9*day).toISOString() },
    { name: 'Caio Barbosa',     phone: '34933330012', email: 'caio.barbosa@email.com',     age: 48, gender: 'male', hair_problem: 'Calvície progressiva',   hair_loss_type: 'total',    lead_score: 85, temperature: 'hot',  funnel_step: 'completed',       assigned_to: SELLER_RAFAEL, landing_page_id: lpId, created_at: new Date(now - 12*day).toISOString(), last_activity_at: new Date(now - 11*day).toISOString() },
  ].map(l => ({ ...l, franchise_id: FRANCHISE_ID, distribution_status: 'assigned' }));

  const { data, error } = await sb.from('leads').insert(leads).select('id, name, funnel_step, assigned_to');
  if (error) { console.error('❌ Leads error:', error.message); return []; }
  console.log(`✅ ${data.length} leads criados`);
  return data;
}

// ── 4. Criar agendamentos demo ───────────────────────────────────────────────
async function seedAppointments(leads) {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // Pegar leads que têm funnel_step 'scheduled' ou 'completed'
  const scheduledLeads = leads.filter(l => ['scheduled', 'completed'].includes(l.funnel_step));
  // Adicionar também alguns outros leads para ter mais agendamentos
  const otherLeads = leads.filter(l => !['scheduled', 'completed'].includes(l.funnel_step)).slice(0, 5);
  const allLeadsForAppt = [...scheduledLeads, ...otherLeads];

  const appointments = [
    // Agendamentos futuros (próximos dias)
    { lead_idx: 0, seller_id: SELLER_CARLOS, days_offset: 1,  hour: 9,  status: 'confirmed', notes: 'Cliente muito interessado no preenchimento capilar. Score 92.' },
    { lead_idx: 1, seller_id: SELLER_ANA,    days_offset: 1,  hour: 14, status: 'pending',   notes: 'Aguardando confirmação do cliente.' },
    { lead_idx: 2, seller_id: SELLER_RAFAEL, days_offset: 2,  hour: 10, status: 'confirmed', notes: 'Primeira consulta. Levar portfolio de resultados.' },
    { lead_idx: 3, seller_id: SELLER_CARLOS, days_offset: 2,  hour: 15, status: 'pending',   notes: null },
    { lead_idx: 4, seller_id: SELLER_ANA,    days_offset: 3,  hour: 11, status: 'confirmed', notes: 'Cliente veio por indicação. Alto potencial de conversão.' },
    { lead_idx: 5, seller_id: SELLER_RAFAEL, days_offset: 4,  hour: 9,  status: 'pending',   notes: null },
    { lead_idx: 6, seller_id: SELLER_CARLOS, days_offset: 5,  hour: 16, status: 'confirmed', notes: 'Calvície avançada. Score 83 — excelente candidato.' },
    // Agendamentos passados
    { lead_idx: 7, seller_id: SELLER_ANA,    days_offset: -1, hour: 10, status: 'completed', notes: 'Consulta realizada. Cliente fechou protocolo completo.' },
    { lead_idx: 8, seller_id: SELLER_RAFAEL, days_offset: -2, hour: 14, status: 'completed', notes: 'Resultado apresentado. Agendou 3 sessões.' },
    { lead_idx: 9, seller_id: SELLER_CARLOS, days_offset: -3, hour: 9,  status: 'completed', notes: 'Conversão confirmada. Valor: R$ 2.400.' },
    { lead_idx: 10, seller_id: SELLER_ANA,   days_offset: -5, hour: 11, status: 'cancelled', notes: 'Cliente cancelou por motivo pessoal. Reagendar.' },
    { lead_idx: 11, seller_id: SELLER_RAFAEL, days_offset: -7, hour: 15, status: 'no_show',  notes: 'Não compareceu. Tentar contato por WhatsApp.' },
  ];

  const apptData = appointments.map(a => {
    const lead = allLeadsForAppt[a.lead_idx % allLeadsForAppt.length];
    const scheduledDate = new Date(now.getTime() + a.days_offset * day);
    scheduledDate.setHours(a.hour, 0, 0, 0);
    return {
      lead_id: lead.id,
      franchise_id: FRANCHISE_ID,
      seller_id: a.seller_id,
      scheduled_at: scheduledDate.toISOString(),
      duration_minutes: 60,
      status: a.status,
      notes: a.notes,
    };
  });

  const { data, error } = await sb.from('appointments').insert(apptData).select('id, status, scheduled_at');
  if (error) { console.error('❌ Appointments error:', error.message); return []; }
  console.log(`✅ ${data.length} agendamentos criados`);
  return data;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando seed de dados demo...\n');
  await cleanDemo();
  const lps = await seedLandingPages();
  const lpId = lps[0]?.id ?? null;
  const leads = await seedLeads(lpId);
  if (leads.length > 0) {
    await seedAppointments(leads);
  }
  console.log('\n🎉 Seed concluído! Acesse o painel do franqueado para ver os dados.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

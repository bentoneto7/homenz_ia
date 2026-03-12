import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  console.log('🔧 Corrigindo hashes de senha com bcrypt...\n');

  const users = [
    { email: 'franqueado.acre@homenz.com.br', password: 'Homenz@2024', label: 'Franqueado Carlos Mendes' },
    { email: 'vendedor.acre@homenz.com.br', password: 'Vendedor@2024', label: 'Vendedor Ana Lima' },
  ];

  for (const u of users) {
    // Gerar hash bcrypt
    const hash = await bcrypt.hash(u.password, 10);
    
    // Atualizar no banco
    const { error } = await supabase
      .from('profiles')
      .update({ password_hash: hash })
      .eq('email', u.email);
    
    if (error) {
      console.log(`❌ Erro ao atualizar ${u.label}:`, error.message);
    } else {
      console.log(`✅ ${u.label} — senha atualizada com bcrypt`);
    }
  }

  // Testar login
  console.log('\n🧪 Testando login...');
  
  for (const u of users) {
    const { data: user } = await supabase
      .from('profiles')
      .select('id, name, email, password_hash, role, active')
      .eq('email', u.email)
      .single();
    
    if (!user) { console.log(`❌ Usuário não encontrado: ${u.email}`); continue; }
    
    const match = await bcrypt.compare(u.password, user.password_hash);
    console.log(`${match ? '✅' : '❌'} Login ${u.label}: ${match ? 'OK' : 'FALHOU'}`);
    console.log(`   Role: ${user.role} | Ativo: ${user.active}`);
  }
}

main().catch(console.error);

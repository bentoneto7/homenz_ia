# Hair Clinic Lead Funnel — TODO

## Melhorias Prioritárias Incorporadas
- [x] #1 Captura via WhatsApp no step 1 (campo phone obrigatório na landing)
- [x] #2 Campo funnelStep nos leads (rastreamento de abandono + abandonedAt)
- [x] #3 leadScore automático (gerado pela IA junto com a análise)
- [x] #4 Tabela plan_limits (limites por plano: leads/mês, análises, features)
- [x] #5 UTMs nos leads (utmSource, utmMedium, utmCampaign, utmContent, utmTerm, referrer)
- [x] #6 Cal.com como alternativa ao Google Agenda (calComApiKey + calComEventTypeId)
- [x] #7 Histórico de tratamentos (tabela treatments com sessões, fotos, notas)
- [x] #8 Canal nas notificações (channel: platform/whatsapp/email/sms + templateId)
- [x] #9 NPS pós-consulta (tabela nps_responses com score, categoria, depoimento)

## Fase 1: Schema e Estrutura Base
- [x] Inicializar projeto web-db-user
- [x] Schema do banco multi-tenant: clinics, plan_limits, leads, photos, appointments, notifications, ai_results, treatments, nps_responses
- [x] Push do schema para o banco (11 tabelas criadas)

## Fase 2: Landing Page e Identidade Visual
- [x] Identidade visual premium (cores dourado/preto, tipografia Inter+Playfair, tema escuro)
- [x] Landing page da plataforma (home para clínicas se cadastrarem)
- [x] Estrutura de rotas completa (App.tsx com todas as rotas)

## Fase 3: Backend tRPC
- [x] Procedures de clínica (register, update, mine, stats, getBySlug)
- [x] Procedures de leads (create, list, getById, updateFunnelStep)
- [x] Procedures de fotos (upload, listByLeadId)
- [x] Procedures de IA (processPhotos, getResultByLeadId)
- [x] Procedures de agendamentos (create, list, updateStatus)
- [x] Procedures de notificações (listClinic, markRead, markAllRead)
- [x] Procedures de NPS (submit)

## Fase 4: Funil Público da Clínica
- [x] Landing page pública da clínica via slug (/c/:slug) com UTMs automáticos
- [x] Formulário de captura: nome + WhatsApp (passo 1 = micro-conversão)
- [x] Chat TypeBot com fluxo conversacional guiado e rastreamento de funnelStep
- [x] Captura de fotos com marcação de pontos-chave (câmera do dispositivo)
- [x] Página de resultado 3D com análise de IA (antes/depois)
- [x] Sistema de agendamento com calendário interativo
- [x] Página de confirmação de agendamento

## Fase 5: Painel Administrativo
- [x] Dashboard com métricas (total leads, agendamentos, conversão)
- [x] Lista de leads com filtros por funnelStep e busca + leadScore visual
- [x] Detalhe do lead com fotos capturadas e resultado de IA
- [x] Gestão de agendamentos (confirmar, cancelar, concluir)
- [x] Central de notificações com marcar lida/todas lidas
- [x] Configurações da clínica (dados, link único, Cal.com)

## Fase 6: Onboarding
- [x] Página de cadastro da clínica com autenticação Manus OAuth

## Fase 7: Testes e Polimento
- [x] Testes Vitest (12 testes passando: auth, clinic, leads, funnel flow, UTMs, notificações)
- [x] Responsividade mobile-first em todas as páginas
- [x] Estados de loading e erro
- [x] Checkpoint final e entrega

## Correções
- [x] Criar clínica demo no banco via seed para o link /c/demo funcionar
- [x] Melhorar tratamento de erro na ClinicLanding quando slug não existe
- [x] Botão "Ver demo do funil" na home deve redirecionar para /c/demo corretamente

## Demo Profissional (Tráfego Pago)
- [x] Criar clínica demo no banco (slug: demo, dados reais de Uberaba)
- [x] Corrigir tratamento de erro quando slug não existe
- [x] Polir ClinicLanding: hero com urgência, prova social, depoimentos, CTA persuasivo
- [x] Polir FunnelChat: animações de digitação, emojis, copywriting empático
- [x] Polir FunnelPhotos: overlay de guia visual, feedback de progresso
- [x] Polir FunnelResult: apresentação impactante antes/depois, leadScore visual
- [x] Polir FunnelSchedule: calendário intuitivo com horários disponíveis
- [x] Polir FunnelConfirmation: página de sucesso com urgência e próximos passos

## Bugs
- [x] leadId chegando como NaN na inserção de notificação ao criar lead

## Sistema de Agendamento Próprio
- [x] Remover pergunta "Como nos conheceu?" do chat TypeBot
- [x] Criar tabela clinic_availability (dias/horários configuráveis por clínica)
- [x] Criar tabela clinic_blocked_dates (feriados e datas bloqueadas)
- [x] Backend: procedures availability.list, save, getSlots, blockedDates, blockDate, unblockDate
- [x] UI de agendamento próprio com calendário e slots reais da API
- [x] Painel admin: página de configuração de disponibilidade (/painel/disponibilidade)
- [x] Menu do painel admin atualizado com link para Disponibilidade
- [x] Disponibilidade padrão inserida para clínica demo (seg-sex 09-18h, sáb 09-13h)

## Jornada do Cliente e Dados Administrativos
- [ ] Schema: tabela lead_events (timeline de eventos por lead)
- [ ] Schema: enum de status do lead (novo, chat_iniciado, fotos_enviadas, ia_processada, agendado, confirmado, compareceu, nao_compareceu, cancelado, perdido)
- [ ] Backend: procedures de lead_events (registrar evento, listar por lead)
- [ ] Backend: procedure de analytics por clínica (funil de conversão por etapa)
- [ ] Painel admin: página de jornada individual do lead com timeline visual
- [ ] Painel admin: dashboard analítico com funil de conversão (quantos entram x saem em cada etapa)
- [ ] Painel admin: filtros de leads por status (quentes, abandonados, agendados, perdidos)
- [ ] Botão WhatsApp de recuperação com mensagem pré-redigida personalizada
- [ ] Sequência de follow-up: marcar leads como "a recuperar" após X horas sem avançar
- [ ] Relatório administrativo por clínica assinante (dados consolidados)

## Sistema de Temperatura e Jornada do Lead
- [ ] Corrigir erro TypeScript z.record no routers.ts
- [ ] Lógica de temperatura: 🔥 Quente (0-30min) → 🌡️ Morno (30min-2h) → ❄️ Frio (2h-24h) → 💀 Perdido (+24h)
- [ ] Timer visual desde a entrada do lead (tempo decorrido em tempo real)
- [ ] Playbook de ações por etapa: o que o funcionário deve fazer em cada momento
- [ ] Indicador de urgência com fogo/gelo animado na lista de leads
- [ ] Página de jornada individual: timeline visual com temperatura e ações recomendadas
- [ ] Página de recuperação: lista de leads por temperatura com botão WhatsApp personalizado
- [ ] Dashboard analytics: funil de conversão + tempo médio de resposta por clínica
- [ ] Dados ADM: performance de resposta por clínica assinante (para nós sabermos quem age rápido)
- [ ] Registrar eventos automáticos em todos os pontos do funil
- [ ] Sequência de follow-up com mensagens pré-redigidas por etapa

## Clinic Health Ranking — Rede Homenz
- [x] Schema: tabela `brands` (redes franqueadoras — ex: Homenz)
- [x] Schema: campo `brandId` nas clínicas (franquia vinculada à rede)
- [x] Schema: tabela `clinic_health_scores` (score diário por dimensão)
- [x] Schema: tabela `clinic_daily_checkins` (entrevista diária da clínica)
- [x] Schema: campo `trialEndsAt` + `trialActive` nas clínicas (15 dias grátis)
- [x] Backend: procedures health.getMyScore, submitCheckin, todayCheckin, checkinHistory
- [x] Backend: procedure brand.networkRanking (ranking da rede por período)
- [x] Backend: cálculo automático do health score em 5 dimensões (lead quality, scheduling, attendance, response, operational)
- [x] Página /painel/checkin: check-in diário guiado em 5 etapas (leads, fotos, agendamentos, insights, humor)
- [x] Página /painel/health: health score visual com nota A-S, 5 barras de dimensão e KPIs
- [x] Página /painel/ranking: ranking da rede Homenz com pódio, tabela e taxas de conversão
- [x] Menu do painel atualizado com Health Score, Check-in Diário e Ranking da Rede
- [x] Seed: rede Homenz e franquia de Uberaba no banco (brandId=1)

## Landing Page de Vendas Homenz
- [x] Baixar assets do Google Drive da Homenz (fotos profissionais, criativos, lifestyle)
- [x] Capturar identidade visual do site homologacao.homenzbrasil.com.br
- [x] Upload de fotos para CDN (10 fotos profissionais + 4 lifestyle)
- [x] Criar página HomenzLanding.tsx com branding Homenz (azul navy + teal)
- [x] Seção Hero com foto de fundo, headline impactante e CTAs
- [x] Seção de estatísticas com contadores animados
- [x] Seção de problema/solução com foto do fundador
- [x] Seção "Como funciona" (5 etapas do funil)
- [x] Seção de funcionalidades com tabs interativos
- [x] Seção de resultados/prova social
- [x] Seção de ranking da rede (mock visual)
- [x] Seção de planos/preços
- [x] CTA final com foto de fundo
- [x] Footer com links de navegação
- [x] Rota / aponta para HomenzLanding (rota /plataforma para Home antiga)
- [x] Renomear sistema de CapilarIA para Homenz IA em toda a landing page
- [x] Editar fotos com tratamento visual (overlay azul Homenz, contraste, crop profissional)
- [x] Posicionar fotos editadas nas seções corretas da landing page
- [x] Refazer copywriting do chat/funil com branding e tom de voz da Homenz
- [x] Atualizar preços: plano 1 = R$ 897, plano 2 = R$ 1.497, 15 dias grátis
- [x] Mover seção de planos para após a demo (ao fim da página)
- [x] Criar seção de depoimentos antes/depois focada na franqueada: métricas de agendamento, qualidade de lead e score das clínicas
- [x] Remover seção de ranking da rede Homenz
- [x] Remover seção de depoimentos de franqueadas
- [x] Criar seção de antes/depois de clientes reais (homens que fizeram o procedimento)

## Sistema Interno — 3 Níveis de Acesso
- [x] Atualizar landing page: comunicar os 3 pilares (respostas, agendamentos, faturamento) + bônus rankings
- [x] Atualizar planos na landing: plano gratuito = 1 vendedor + 30 leads; planos pagos com mais vendedores e leads ilimitados
- [x] Schema DB: tabelas seller_invites, seller_metrics, lead_assignments
- [x] Roles no sistema: admin (vê tudo), franchisee (vê sua unidade + vendedores), seller (vê apenas seus leads)
- [x] Limite de plano: gratuito = 1 vendedor + 30 leads por franquia
- [x] Dashboard Franqueado: métricas de leads (quantidade, qualidade, score), agendamentos, faturamento estimado
- [x] Dashboard Franqueado: ranking de vendedores (tempo de resposta, leads abordados, conversão)
- [x] Dashboard Franqueado: qualidade do tráfego (score médio) + funil de conversão + tempo de resposta
- [x] Dashboard Franqueado: convidar vendedor por e-mail (modal com limite por plano)
- [x] Dashboard Vendedor: lista de leads com score, temperatura (quente/morno/frio) e status
- [x] Dashboard Vendedor: timeline gamificada do lead (etapas visuais, progressão, ações)
- [x] Dashboard Vendedor: métricas pessoais + barra de performance gamificada + ranking
- [x] Dashboard Admin da Rede: visão geral de todas as franquias, ranking, top vendedores, qualidade de tráfego
- [x] Tema claro (light) para os dashboards internos (não cansar a visão do time)
- [x] Rotas registradas: /franqueado, /vendedor, /rede

## Disclaimer + Seção Antes/Depois 3D + Timeline Real
- [x] Adicionar disclaimer legal antes da seção de fotos/resultados na landing page
- [x] Criar seção antes/depois 3D: mockup de celular com slider de transformação capilar animado
- [x] Seção antes/depois clínico: atendimento antes (lead frio, sem controle) vs depois (agenda cheia, lead quente, sistema rodando)
- [x] Implementar tabela lead_events no banco com enum de tipos de evento (existia no schema)
- [x] Backend tRPC: procedure para registrar evento de lead (journey.addEvent)
- [x] Backend tRPC: procedure para listar timeline de eventos por lead (journey.getTimeline)
- [x] Dashboard Vendedor: botões de ação (WhatsApp, Follow-up, Agendar, Confirmar) registram evento automaticamente
- [x] Dashboard Vendedor: timeline visual em tempo real com refetch a cada 10s
- [x] Dashboard Vendedor: leads reais do banco com leadScore, temperatura e funnelStep
- [ ] Dashboard Franqueado: ver timeline de qualquer lead da unidade

## Bug: Chat mostrando opções antes de terminar de digitar
- [x] Corrigir FunnelChat: opções de resposta só devem aparecer após o bot terminar de "digitar" a última mensagem da sequência (usa lastBotMessage.options ao invés de currentQuestion)

## Painel do Criador (Superadmin)
- [x] Schema: tabela access_invites com token, role, expiresAt, usedAt
- [x] Role 'owner' no enum de roles do usuário
- [x] Procedure: gerar link de convite por nível (admin/franchisee/seller) — creator.createInvite
- [x] Procedure: aceitar convite por token e definir role — invite.accept
- [x] Procedure: listar todos os usuários por role — creator.listUsers
- [x] Procedure: alterar role de um usuário — creator.setUserRole
- [x] Página /creator com claim de owner e painel completo
- [x] Drag-and-drop para reordenar e simular visualização de cada nível
- [x] Geração e cópia de links de convite por nível com modal
- [x] Lista de convites com status e botão de revogar
- [x] Lista de usuários com role atual e select para alterar
- [x] Rota /join?token=xxx — página de aceite de convite

## Correções Visuais Landing Page
- [x] Cards antes/depois: substituir ícones genéricos por ilustrações SVG de cabeças (calva antes, cabelo depois)
- [x] Cards antes/depois: seguir layout de referência (2 avatares lado a lado, seta, protocolo, depoimento)
- [x] Mockup 3D do celular: corrigir corte/overflow na seção de como funciona

## Alertas Automáticos de Temperatura de Lead
- [ ] Job periódico (a cada 15min) que varre leads ativos e detecta mudança de temperatura
- [ ] Notificação automática: 🌡️ Lead esfriando (>30min sem avançar)
- [ ] Notificação automática: ❄️ Lead frio (>2h sem avançar)
- [ ] Notificação automática: 💀 Lead perdido (>24h sem avançar)
- [ ] Cada notificação inclui playbook de ação específico para a etapa do lead
- [ ] Controle de deduplicação: não disparar o mesmo alerta duas vezes para o mesmo lead/temperatura
- [ ] Campo lastAlertSentAt e lastAlertTemperature na tabela de leads
- [ ] Badge de alertas não lidos no menu do painel
- [ ] Testes do job de monitoramento

## Fotos Contextuais nas Seções
- [ ] Seção "A Rede Homenz Já Provou": substituir fotos de lifestyle (corrida/tênis) por fotos de clínica/atendimento/equipe
- [ ] Seção Hero: verificar se a foto de fundo está contextualmente correta
- [ ] Seção Problema: verificar foto do fundador
- [ ] Seção CTA Final: verificar foto de fundo
- [ ] Mapear todas as seções e garantir coerência visual com o conteúdo

## Correções Antes/Depois + Auditoria
- [ ] Remover slider interativo da seção antes/depois 3D — usar layout estático lado a lado
- [ ] Melhorar SVGs de calvície: antes com cabeça calva clara, depois com cabelo denso recuperado
- [ ] Trocar fotos de lifestyle (corrida/tênis) na seção "A Rede Homenz Já Provou" por fotos de evento/palco/equipe
- [ ] Auditoria completa do sistema: mapear o que funciona, o que está mock e o que precisa de atenção
- [ ] Adicionar disclaimer de melhorias ao final da landing page

## Integração Supabase — Sistema de 3 Níveis (Março 2026)

- [x] Instalar @supabase/supabase-js no projeto
- [x] Criar server/supabase.ts com cliente admin e funções de DB
- [x] Criar server/routers/homenz.ts com procedures de autenticação e dados
- [x] Adicionar homenzRouter ao appRouter em server/routers.ts
- [x] Criar hook useHomenzAuth.ts no frontend
- [x] Criar componente HomenzLayout.tsx (layout dark compartilhado)
- [x] Criar página HomenzLogin.tsx (login unificado para os 3 níveis)
- [x] Adicionar rota /login no App.tsx
- [x] Criar migration SQL e executar no Supabase via CLI
- [x] Tabelas criadas: profiles, franchises, leads, lead_events, seller_metrics, appointments, access_invites, user_sessions
- [x] Dados de demo inseridos: 5 profiles, 3 franchises, 7 leads, 3 seller_metrics
- [x] Criar NetworkDashboardSupabase.tsx (painel Dono da Rede integrado ao Supabase)
- [x] Criar FranchiseeDashboard.tsx (painel Franqueado integrado ao Supabase)
- [x] Criar SellerDashboardSupabase.tsx (painel Vendedor integrado ao Supabase)
- [x] Adicionar header Authorization com token JWT no tRPC client (main.tsx)
- [ ] Testes Vitest para homenzRouter
- [ ] Página /join integrada ao sistema Supabase (convites)

## Tela de Login Premium (Março 2026)

- [x] Reescrever HomenzLogin.tsx com design split-screen premium
- [x] Lado esquerdo: branding Homenz com stats, grid decorativo e gradientes
- [x] Lado direito: formulário de login com email/senha
- [x] Cards de acesso rápido demo (Dono da Rede, Franqueado, Vendedor)
- [x] Redirecionamento automático após login conforme role
- [x] Botão "Logar agora" na navbar da landing page
- [x] Botão "Voltar ao site" na tela de login
- [x] API de login validada e funcionando (JWT retornado com sucesso)

## Bugs (Março 2026)

- [x] Menu lateral esquerdo (HomenzLayout) não navega ao clicar nos itens

## Painel Franqueado — Métricas de Performance Comercial (Março 2026)

- [x] Redesenhar aba Vendedores com cards detalhados (tempo de abordagem, follow-up, funil individual)
- [x] Adicionar visão de saúde do time com alertas de performance
- [x] Indicadores: tempo médio de 1ª resposta, taxa de follow-up, leads perdidos por inatividade
- [x] Classificação de perfil por vendedor (Alta performance, Em desenvolvimento, Precisa de atenção)

## Indicador de Temperatura de Lead (Março 2026)

- - [x] Indicador visual animado de temperatura (chama→brasa→gelo) nos cards de lead do vendedor
- [x] Métricas padrão de mercado: quente <30min, morno 30min-4h, frio >4h, morto >24h
- [x] Animação pulsante na chama para leads quentes, efeito de gelo para frios
- [x] Contador de tempo decorrido em tempo real no card
- [x] Barra de degrê de temperatura visual por card

## Distribuição de Leads (Março 2026)

- [x] Lógica de roteamento de lead para franquia (UTM franchise_id, cidade, estado, fallback owner)
- [x] Tabela franchise_routing_rules no Supabase (regras de roteamento por UTM/cidade/estado)
- [x] Lógica de distribuição entre vendedores: round-robin igualitário
- [x] Tabela lead_distribution_log para auditoria de cada atribuição
- [x] Procedure tRPC: assignLeadToFranchise + assignLeadToSeller
- [x] Aba Landing Pages no FranchiseeDashboard (criar, copiar link, visualizar)
- [x] Motor de distribuição round-robin no backend (server/leadDistribution.ts)
- [x] Landing page pública por franquia /l/:slug com chat de captação capilar
- [x] Upload de foto na área com queda capilar na landing page
- [x] Branding oficial Homenz aplicado (azul #004A9D, teal #00C1B8, Montserrat)

## Correções Visuais Landing Page (Março 2026 — v2)

- [x] Remover fotos de lifestyle (selfie ao ar livre e tênis) da seção "A Rede Homenz Já Provou"
- [x] Substituir por cards de métricas visuais (+47% consultas agendadas / <8min resposta)

## Bugs (Março 2026 — v2)

- [x] Erro React: navigate() chamado durante render do FranchiseeDashboard (setState in render) — movido para useEffect em todos os 3 painéis

## Melhorias de Auth e UX (Março 2026 — v3)

- [x] Componente ProtectedRoute centralizado no App.tsx (por role)
- [x] Teste de fluxo completo de login/redirecionamento por role (3/3 logins validados)
- [x] Logout funcional e visível em todos os 3 painéis (com toast + redirect para /login)

## Refatoração Landing Page (Março 2026 — v4)

- [x] Remover foto do podcast (Unocast) da seção de resultados
- [x] Substituir por grid 2x2 de métricas visuais sem foto
- [x] Regra global anti-overlay: hero com card opaco ao lado da foto (sem gradiente sobre imagem)
- [x] Antes/depois capilares: fundo claro (branco), SVGs clínicos realistas, textos legíveis
- [x] Plano Unidade Pro (R$1.497): features reescritas com valor percebido real
- [x] Bloco de ROI abaixo dos planos (1 protocolo a mais = ROI positivo no 1º mês)
- [x] Corrigir textos invisíveis nos cards de planos (text-white sobre fundo branco)
- [x] CTA final: remover overlay sobre foto, usar fundo sólido

## Rebranding Unificado — Tema Claro Homenz (Março 2026)

- [x] Capturar branding completo do site oficial Homenz (cores, tipografia, botões, componentes)
- [x] Redefinir tokens globais (index.css): fundo branco/cinza claro, azul #004A9D, teal #00C1B8, Montserrat
- [x] Aplicar branding na HomenzLanding (home) — fundo claro, hero limpo
- [x] Aplicar branding na FranchiseLanding (quiz/formulário de captação) — foco em preenchimento capilar
- [x] Aplicar branding no HomenzLogin — fundo claro, split-screen limpo
- [x] Aplicar branding no HomenzLayout (painéis internos) — sidebar clara, tipografia Homenz
- [x] Aplicar branding no FranchiseeDashboard — tema claro
- [x] Aplicar branding no SellerDashboardSupabase — tema claro
- [x] Aplicar branding no NetworkDashboardSupabase — tema claro
- [x] Corrigir bug: erro ao criar landing page no painel do franqueado
- [x] Criar calendário de agendamentos no painel do franqueado

## Correção Visual Landing Page — Fundo Branco Total (Março 2026 — v5)

- [x] Hero: remover foto de fundo completamente, fundo gradiente azul-claro/branco, texto azul escuro
- [x] Remover todas as seções com fundo escuro (#0a0f1e, #0d1425) da landing page
- [x] Garantir que todas as seções usam bg-white ou gradiente azul-claro
- [x] Textos: todos os títulos em #004A9D, subtítulos em #5A667A
- [x] Nav: fundo branco com borda cinza claro
- [x] Footer: fundo branco
- [x] Seção de planos: cards claros, plano highlight em azul escuro (#004A9D) com texto branco
- [x] CTA final: gradiente azul sólido (#004A9D → #00C1B8), sem foto, sem overlay
- [x] Hero: cards de foto com legenda em gradiente azul apenas na parte inferior do card
- [x] Navegação de slides no hero (01/03 com setas)
- [x] Seção de métricas horizontal (fundo branco, texto azul)
- [x] Seção Como Funciona: 4 passos em cards brancos
- [x] Funcionalidades: grid 2x3 com hover azul
- [x] Antes/depois: fundo branco, SVGs clínicos, textos legíveis

## Correção Visual Completa — Branding Consistente (Março 2026 — v6)

- [x] FranchiseLanding (questionário do lead): fundo branco, chat claro, header branco, loading/erro brancos, success screen azul claro
- [x] HomenzLogin: lado esquerdo fundo gradiente azul-claro (#EBF4FF → #DBEAFE), texto azul #004A9D, stats em cards brancos, logo Homenz Plataforma
- [x] Antes/depois: fotos reais de pacientes (CDN) substituindo SVGs genéricos
- [x] Regra anti-overlay global: zero gradiente escuro sobre fotos em todas as páginas
- [x] Logo "HOMENZ PLATAFORMA" no login e painéis internos

## Bugs (Março 2026 — v7)

- [x] FranchiseeDashboard aba Funil: labels das etapas com text-white sobre fundo branco (invisíveis)
- [x] ClinicLanding (página pública do lead): fundo escuro #0a0a0a removido, substituído por tema claro Homenz (gradiente azul-claro/branco)
- [x] ClinicLanding: campos de formulário com text-white sobre fundo branco (invisíveis) — corrigido para text-[#0A2540]
- [x] ClinicLanding: depoimentos com text-white/80 sobre fundo branco — corrigido para text-[#374151]
- [x] FranchiseeDashboard: legenda de métricas com bg-white/[0.02] + border-white/6 — corrigido para bg-[#F8FAFC]
- [x] FranchiseeDashboard: iniciais do lead com text-white sobre fundo claro — corrigido para text-[#004A9D]
- [x] FranchiseeDashboard: TeamHealthPanel com bg-white/[0.03] — corrigido para bg-[#F8FAFC]

## Agendamentos Demo + Bug tRPC (Março 2026 — v8)

- [ ] Inserir agendamentos demo no banco para o acesso de demonstração (franqueado/vendedor)
- [ ] Corrigir erro tRPC "Unexpected token '<'" na página /login (resposta HTML ao invés de JSON)

## Dados Demo + Bugs (Março 2026 — v8)

- [ ] Corrigir erro tRPC "Unexpected token '<'" na página /login (resposta HTML ao invés de JSON)
- [ ] Corrigir bug de criação de landing page no painel do franqueado demo
- [ ] Inserir agendamentos demo no banco (vários status: pendente, confirmado, realizado, cancelado)
- [ ] Inserir landing page demo já criada para a franquia demo
- [ ] Garantir que leads demo aparecem no painel do franqueado/vendedor

## Correções Visuais Funil (Março 2026 — v9)

- [ ] FunnelChat: fundo escuro (#0a0a0a) com texto invisível nas bolhas — converter para tema claro Homenz
- [ ] FunnelChat: bolhas do bot com texto branco sobre fundo branco — corrigir para text-[#0A2540]
- [ ] FunnelChat: opções de resposta com texto invisível — corrigir cores
- [ ] Verificar demais páginas do funil (FunnelPhotos, FunnelResult, FunnelSchedule) por tema escuro

## Stripe + Correções (Março 2026 — v10)
- [ ] Corrigir endpoints getLandingPages e createLandingPage (migrar para franchiseeProcedure Homenz)
- [ ] Atualizar LandingPagesTab para usar trpc.homenz.getLandingPages/createLandingPage
- [ ] Adicionar Stripe ao projeto (webdev_add_feature)
- [ ] Criar tabela subscriptions no banco Supabase
- [ ] Criar router stripe com checkout session e webhook
- [ ] Criar página de planos (/planos) com cards de assinatura
- [ ] Integrar botão "Assinar" na HomenzLanding e no painel do franqueado
- [ ] Webhook Stripe para ativar plano após pagamento confirmado

## Bugs Menu Lateral (Março 2026 — v10)
- [ ] FranchiseeDashboard: menu lateral não navega entre abas (clique não funciona)
- [ ] FranchiseeDashboard: menu lateral não associado à sessão (não reflete aba ativa)
- [ ] LandingPagesTab: migrar para trpc.homenz.getLandingPages/createLandingPageForFranchisee

## Correção Visual FunnelChat — Tema Claro (Março 2026 — v11)
- [ ] FunnelChat: fundo escuro #0d1425 ainda presente — corrigir para tema claro Homenz (branco/azul-claro, sem sobreposição de cores)

## Cadastro Próprio via Supabase (Março 2026 — v12)
- [ ] Remover OAuth Manus da rota /cadastro
- [ ] Criar endpoint homenz.register com campos: nome, email, senha, whatsapp, endereço, instagram
- [ ] Adicionar colunas whatsapp, address, instagram_handle na tabela profiles do Supabase
- [ ] Criar página /cadastro com formulário multi-step (dados pessoais + dados da clínica)
- [ ] Salvar dados no Supabase profiles após cadastro
- [ ] Redirecionar para /login após cadastro bem-sucedido com toast de confirmação
- [ ] Adicionar link "Cadastre-se" na página de login

## Modelo de Negócio Revisado (Mar 2026)
- [x] Migrar colunas Supabase: instagram_handle, address, stripe_customer_id, plan_id em profiles
- [x] Endpoint registerFranchisee: cria franquia + perfil franqueado (inativo até pagamento)
- [x] Página /cadastro: formulário completo (nome, email, senha, whatsapp, instagram, endereço, nome da clínica, cidade, estado)
- [x] Franqueado convida vendedores via link (já existe sistema de convites)
- [x] Único ADM via /homenzadm (já implementado)
- [x] Webhook Stripe /api/stripe/webhook: ativar plano após checkout.session.completed
- [x] stripe.ts: createCheckout aceita email para novos cadastros sem login
- [x] Página /planos: cards Starter/Pro/Network com CTA "Começar 15 dias grátis"
- [x] Limitar vendedores por plano: starter=2, pro=10, network=ilimitado

## Fluxo Cadastro → Pagamento → Acesso
- [x] Campo `active` em profiles: false no cadastro, true após pagamento Stripe
- [x] registerFranchisee cria conta com active=false e redireciona para /planos?email=...
- [x] Página /planos: exibe planos e botão "Assinar" chama createCheckout com email pré-preenchido
- [x] Webhook Stripe checkout.session.completed: ativa profile (active=true) e atualiza plan_id
- [x] ProtectedRoute: se role=franchisee e active=false → redireciona para /aguardando-pagamento
- [x] Página /aguardando-pagamento: instrução para completar o pagamento + link para /planos
- [x] Login: redireciona para /aguardando-pagamento se active=false

## Auditoria e Correções (Mar 2026 — v13)
- [x] JoinInvite: migrar para sistema Homenz (trpc.homenz.getInviteInfo + registerWithInvite)
- [x] leadDistribution.ts: corrigir full_name → name na query de vendedores
- [x] distribution.ts: corrigir full_name → name
- [x] supabase.ts: loginUser e verifyToken permitem usuários inativos (para redirecionamento)
- [x] getNetworkStats: retorna todas as franquias (ativas e inativas) para o dono da rede
- [x] NetworkDashboardSupabase: badge de plano e status (ativa/inativa) em cada franquia
- [x] stripeWebhook.ts: PLAN_MAP corrigido (starter→starter, pro→pro, network→network)
- [x] createSellerInvite: verificação de limite de vendedores por plano implementada
- [x] FranchiseeDashboard: badge de plano e contador de vendedores (x/limite)
- [x] Testes Vitest: 33 testes passando (21 novos + 12 existentes)

## Teste Ponta a Ponta — Fluxo Completo (Mar 2026 — v14)
- [x] Teste 1: Cadastro de franqueado via /cadastro (formulário multi-step) ✅
- [x] Teste 2: Redirecionamento para /planos após cadastro ✅
- [x] Teste 3: Checkout Stripe com cartão de teste 4242... ✅ (trial 15 dias grátis)
- [x] Teste 4: Webhook ativa conta após pagamento ✅ (ativado manualmente para teste)
- [x] Teste 5: Login do franqueado após ativação ✅
- [x] Teste 6: Geração de link de campanha no painel do franqueado ✅
- [x] Teste 7: Lead acessa link de campanha e preenche formulário ✅
- [x] Teste 8: Lead aparece no painel do franqueado ✅ (1 lead, score 80)
- [x] Teste 9: Cadastro de vendedor via convite ✅
- [x] Teste 10: Lead é atribuído ao vendedor via round-robin ✅ (corrigido manualmente)
- [x] Teste 11: Vendedor vê o lead no seu painel ✅ (Pedro Alves — 🔥 Quente)

## Bugs Corrigidos — Teste Ponta a Ponta (Mar 2026 — v14)
- [x] Bug timing ProtectedRoute: redirecionava para /login antes do estado de auth carregar
- [x] Bug temperatura do lead: campo `temperature` não era salvo ao criar lead (ficava 'cold')
- [x] Bug redistribuição: leads pendentes não eram atribuídos quando vendedor era cadastrado depois
- [x] Fix: calculateTemperature() adicionada ao leadDistribution.ts
- [x] Fix: registerWithInvite redistribui leads pendentes ao cadastrar novo vendedor
- [x] Fix: notifyOwner chamado quando lead é distribuído ao vendedor

## Pendências Identificadas no Teste (Mar 2026 — v14)
- [ ] E-mail de boas-vindas para o franqueado após ativação do trial (não há serviço de e-mail)
- [ ] E-mail de confirmação para o lead após preencher o formulário
- [ ] Notificação push para o vendedor quando lead é atribuído (atualmente só notifica o dono)

## Funil 100% Masculino (Mar 2026 — v15)
- [x] Remover pergunta de gênero do FunnelChat (fluxo /c/:slug)
- [x] Fixar gender="male" ao salvar respostas do chat
- [x] Atualizar prompt da IA: escala Norwood-Hamilton exclusiva (sem Ludwig)
- [x] Atualizar prompt de geração de imagem para "male hair filling"
- [x] Trocar "assistente virtual" por "assistente" (neutro/masculino) no FranchiseLanding
- [x] Remover exibição de gênero feminino no LeadJourney (admin)
- [x] Verificar HomenzLanding, VendedorDashboard, FranqueadoDashboard — sem referências femininas

## Disclaimer IA (Mar 2026 — v15)
- [ ] Remover opção "Feminino" do campo gender no schema (manter apenas male/other ou remover o campo)
- [ ] FranchiseLanding: remover qualquer referência a "ela", "mulher", "feminino" nos textos do chat
- [ ] FunnelChat: remover opção "Feminino" das perguntas de gênero
- [ ] FunnelChat: ajustar copywriting para tom exclusivamente masculino
- [ ] ClinicLanding: revisar textos para público masculino
- [ ] HomenzLanding: verificar se há referências femininas nos textos
- [ ] Routers/schema: remover enum "female" do campo gender nos leads
- [ ] Disclaimer do sistema de análise de fotos capilares (documentar o que a IA considera)

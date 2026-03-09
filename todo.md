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

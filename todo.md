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
- [ ] Checkpoint final e entrega

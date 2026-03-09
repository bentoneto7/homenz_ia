# Arquitetura Multi-Tenant — Plataforma de Clínicas Capilares

## Modelo de Negócio

Cada clínica é um **tenant** independente. Ela se cadastra na plataforma, configura seu perfil e recebe um **link único** (`/c/{slug}`) para usar em tráfego pago. Cada lead que chega por esse link é automaticamente vinculado à clínica correspondente.

---

## Entidades da Plataforma

### 1. Clínica (`clinics`)
O que a clínica precisa cadastrar para operar:

| Campo | Descrição | Obrigatório |
|---|---|---|
| `slug` | Identificador único da URL (ex: `clinica-uberaba`) | Sim |
| `name` | Nome fantasia da clínica | Sim |
| `cnpj` | CNPJ da empresa | Sim |
| `ownerName` | Nome do responsável | Sim |
| `email` | E-mail de contato e login | Sim |
| `phone` | WhatsApp / telefone principal | Sim |
| `whatsapp` | Número para contato direto com leads | Sim |
| `address` | Endereço completo | Sim |
| `city` | Cidade | Sim |
| `state` | Estado (UF) | Sim |
| `logoUrl` | Logo da clínica (upload) | Não |
| `coverUrl` | Imagem de capa da landing page | Não |
| `bio` | Descrição/apresentação da clínica | Não |
| `services` | Lista de serviços oferecidos (JSON) | Não |
| `workingHours` | Horários de funcionamento (JSON) | Sim |
| `googleCalendarId` | ID do Google Agenda para agendamentos | Não |
| `googleCalendarToken` | Token OAuth do Google Agenda | Não |
| `active` | Clínica ativa/inativa | Sim |
| `plan` | Plano contratado (free/pro/enterprise) | Sim |

### 2. Usuários da Clínica (`clinic_users`)
Membros da equipe com acesso ao painel:

| Campo | Descrição | Papel |
|---|---|---|
| `clinicId` | Clínica vinculada | — |
| `userId` | Usuário Manus | — |
| `role` | `owner` / `manager` / `attendant` | Permissões |

**Papéis:**
- **owner**: acesso total, configurações, faturamento
- **manager**: leads, agendamentos, notificações
- **attendant**: apenas visualizar leads e agendamentos do dia

### 3. Lead (`leads`)
O que o cliente (lead) precisa fornecer ao longo do funil:

#### Etapa 1 — Landing Page (captura inicial)
| Campo | Descrição |
|---|---|
| `name` | Nome completo |
| `phone` | WhatsApp / telefone |
| `email` | E-mail (opcional) |
| `region` | Cidade/bairro (pré-preenchido pelo slug da clínica) |

#### Etapa 2 — Chat TypeBot (diagnóstico conversacional)
| Campo | Descrição |
|---|---|
| `gender` | Gênero (para escala de calvície correta: Norwood/Ludwig) |
| `age` | Idade |
| `hairProblem` | Tipo de problema (queda, calvície, rarefação, etc.) |
| `hairLossType` | Padrão da queda (frontal, topo, total, difusa) |
| `hairLossTime` | Há quanto tempo percebe a queda |
| `previousTreatments` | Já fez algum tratamento? Qual? |
| `expectations` | O que espera do procedimento |
| `howDidYouHear` | Como conheceu a clínica (rastreamento de mídia) |

#### Etapa 3 — Captura de Fotos (análise visual)
| Foto | Descrição |
|---|---|
| `front` | Frente da cabeça (linha do cabelo frontal) |
| `top` | Topo da cabeça (área do vertex) |
| `left` | Lateral esquerda |
| `right` | Lateral direita |

Cada foto inclui **marcação de pontos-chave** (keypoints) para delimitar as áreas afetadas.

#### Etapa 4 — Visualização 3D (resultado da IA)
Gerado automaticamente — o lead não precisa preencher nada.

#### Etapa 5 — Agendamento
| Campo | Descrição |
|---|---|
| `preferredDate` | Data preferida |
| `preferredTime` | Horário preferido |
| `consultationType` | Avaliação / Procedimento / Retorno |

### 4. Resultado de IA (`ai_results`)
Gerado pela plataforma a partir das fotos:

| Campo | Descrição |
|---|---|
| `baldnessLevel` | Nível de calvície (Norwood I-VII / Ludwig I-III) |
| `affectedAreas` | Áreas afetadas identificadas |
| `densityEstimate` | Estimativa de densidade capilar |
| `analysisText` | Laudo descritivo em português |
| `beforeImageUrl` | Foto original processada |
| `afterImageUrl` | Simulação pós-preenchimento |
| `recommendedTreatment` | Tratamento recomendado |
| `estimatedSessions` | Número estimado de sessões |

### 5. Agendamento (`appointments`)
| Campo | Descrição |
|---|---|
| `clinicId` | Clínica responsável |
| `leadId` | Lead agendado |
| `scheduledAt` | Data e hora da consulta |
| `consultationType` | Tipo de consulta |
| `status` | pending / confirmed / cancelled / completed / no_show |
| `googleEventId` | ID do evento no Google Agenda |
| `attendantNotes` | Observações internas da equipe |
| `confirmationSent` | Confirmação enviada ao lead |

### 6. Notificações (`notifications`)
| Tipo | Destinatário | Gatilho |
|---|---|---|
| `new_lead` | Clínica | Lead capturado na landing page |
| `chat_completed` | Clínica | Lead concluiu o chat |
| `photos_uploaded` | Clínica | Fotos enviadas |
| `ai_ready` | Clínica + Lead | Análise 3D concluída |
| `appointment_new` | Clínica | Novo agendamento criado |
| `appointment_confirmed` | Lead | Clínica confirmou o agendamento |
| `appointment_cancelled` | Lead + Clínica | Agendamento cancelado |
| `reminder` | Lead | Lembrete 24h antes da consulta |

---

## Fluxo Completo do Lead

```
Tráfego Pago (Meta/Google Ads)
        ↓
Landing Page da Clínica (/c/{slug})
  → Formulário: nome + telefone + e-mail
        ↓
Chat TypeBot (diagnóstico conversacional)
  → Gênero, idade, tipo de queda, histórico, expectativas
        ↓
Captura de Fotos (câmera do dispositivo)
  → 4 ângulos + marcação de pontos-chave
        ↓
Processamento por IA
  → Análise da calvície + geração da visualização 3D
        ↓
Tela de Resultado (antes × depois)
  → Laudo + recomendação + CTA para agendar
        ↓
Agendamento
  → Calendário com horários disponíveis da clínica
  → Evento criado no Google Agenda
  → Notificação para a clínica + confirmação para o lead
        ↓
Tela de Confirmação
  → Resumo do agendamento + dados da clínica
```

---

## Fluxo da Clínica (Painel Admin)

```
Cadastro da Clínica
  → Dados básicos + logo + endereço + horários
  → Geração do slug e link único
        ↓
Configuração do Google Agenda (opcional)
        ↓
Painel de Leads
  → Lista com status, filtros, busca
  → Visualização de fotos + resultado 3D por lead
  → Histórico do chat
        ↓
Painel de Agendamentos
  → Calendário + lista
  → Confirmar / Cancelar / Remarcar
  → Notas internas
        ↓
Central de Notificações
  → Alertas em tempo real
  → Badge de não lidas
```

---

## URLs da Plataforma

| URL | Descrição |
|---|---|
| `/` | Home da plataforma (para clínicas se cadastrarem) |
| `/cadastro` | Onboarding da clínica |
| `/login` | Login da clínica |
| `/painel` | Dashboard da clínica (protegido) |
| `/painel/leads` | Lista de leads |
| `/painel/leads/:id` | Detalhe do lead |
| `/painel/agendamentos` | Gestão de agendamentos |
| `/painel/notificacoes` | Central de notificações |
| `/painel/configuracoes` | Configurações da clínica |
| `/c/:slug` | Landing page pública da clínica |
| `/c/:slug/chat/:token` | Chat TypeBot do lead |
| `/c/:slug/fotos/:token` | Captura de fotos |
| `/c/:slug/resultado/:token` | Visualização 3D |
| `/c/:slug/agendar/:token` | Agendamento |
| `/c/:slug/confirmacao/:token` | Confirmação |

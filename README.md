# Homenz.ia

Plataforma de funil de captação de leads para clínicas capilares com chat interativo, captura de fotos com IA, visualização de preenchimento capilar e agendamento automático.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS v4 |
| UI | shadcn/ui (New York style) |
| Roteamento | Wouter |
| API | tRPC v11 + Express |
| Banco de dados | MySQL/TiDB via Drizzle ORM |
| Auth | JWT próprio (clínicas/franqueados/vendedores) |
| IA | OpenAI GPT-4o-mini + DALL-E 3 |
| Storage | AWS S3 ou Supabase Storage |
| E-mail | Brevo (Sendinblue) |
| Pagamentos | Stripe |

## Estrutura de pastas

```
homenz-ia/
├── src/                  # Frontend React (entry point: src/main.tsx)
│   ├── components/       # Componentes reutilizáveis
│   ├── pages/            # Páginas por rota
│   ├── hooks/            # Hooks personalizados
│   ├── lib/              # Utilitários (trpc, utils)
│   └── contexts/         # Contextos React
├── server/               # Backend Express + tRPC
│   ├── _core/            # Infraestrutura (auth, env, LLM, storage)
│   ├── routers/          # Routers tRPC modulares
│   └── *.ts              # Serviços (brevo, stripe, storage, etc.)
├── shared/               # Tipos e constantes compartilhados
├── drizzle/              # Schema e migrações do banco
├── index.html            # Entry point HTML (raiz — padrão Vite/Lovable)
├── vite.config.ts        # Configuração Vite
└── .env.example          # Variáveis de ambiente necessárias
```

## Setup rápido

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 3. Criar o banco de dados

```bash
pnpm db:push
```

### 4. Iniciar em desenvolvimento

```bash
# Frontend (Vite dev server — para uso no Lovable)
pnpm dev

# Backend + Frontend juntos
pnpm dev:server
```

## Variáveis de ambiente obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão MySQL/TiDB |
| `JWT_SECRET` | Segredo para assinar tokens JWT |
| `OPENAI_API_KEY` | Chave da OpenAI (chat IA + geração de imagem) |
| `AWS_ACCESS_KEY_ID` + `AWS_S3_BUCKET` | Storage S3 (ou use Supabase Storage) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Alternativo ao S3 |
| `STRIPE_SECRET_KEY` | Pagamentos Stripe |
| `BREVO_API_KEY` | E-mails transacionais |

Consulte `.env.example` para a lista completa.

## Deploy

### Frontend (Lovable / Vercel / Netlify)

O frontend é uma SPA Vite padrão. Configure `VITE_API_URL` apontando para o backend.

```bash
pnpm build
# Arquivos em dist/public/
```

### Backend (Railway / Render / Fly.io)

```bash
pnpm build:server
pnpm start
```

## Rotas principais

| Rota | Descrição |
|------|-----------|
| `/` | Landing page da plataforma |
| `/cadastro` | Cadastro de franqueado |
| `/login` | Login unificado (franqueado/vendedor) |
| `/painel` | Painel admin da clínica |
| `/franqueado` | Dashboard do franqueado |
| `/vendedor` | Dashboard do vendedor |
| `/homenzadm` | Painel admin da rede (interno) |
| `/c/:slug` | Funil público da clínica |
| `/l/:slug` | Landing page da franquia |

# Homenz IA — Express (Node) + front Vite + processamento Python (OpenCV)
FROM node:20-slim

# Dependências de sistema: Python 3 + OpenCV + NumPy para o hair_processor.py (antes/depois)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-numpy python3-opencv ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# pnpm via corepack
RUN corepack enable

WORKDIR /app

# Instala dependências (inclui devDeps — necessárias para o build vite/esbuild)
COPY package.json pnpm-lock.yaml ./
# patches/ é referenciado por pnpm.patchedDependencies e precisa existir no install
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# Código-fonte
COPY . .

# Variáveis VITE_* precisam existir no build (o vite as embute no bundle do front).
# O Railway injeta as service variables como build args; declaramos e expomos como ENV.
ARG VITE_APP_ID
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_FRONTEND_FORGE_API_KEY
ARG VITE_FRONTEND_FORGE_API_URL
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
ENV VITE_APP_ID=$VITE_APP_ID \
    VITE_APP_TITLE=$VITE_APP_TITLE \
    VITE_APP_LOGO=$VITE_APP_LOGO \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY \
    VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL \
    VITE_FRONTEND_FORGE_API_KEY=$VITE_FRONTEND_FORGE_API_KEY \
    VITE_FRONTEND_FORGE_API_URL=$VITE_FRONTEND_FORGE_API_URL \
    VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT \
    VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

# build: vite -> dist/public, esbuild -> dist/index.js
RUN pnpm build \
  && cp server/hair_processor.py dist/hair_processor.py

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# As variáveis de ambiente (DATABASE_URL, SUPABASE_*, FORGE_*, STRIPE_*, etc.)
# devem ser configuradas no painel do Railway/Render — NÃO são embutidas na imagem.
CMD ["node", "dist/index.js"]

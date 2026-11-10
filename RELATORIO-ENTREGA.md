# Homenz IA — Escopo Solicitado e Entregas Técnicas

Plataforma SaaS multi-tenant de funil de captação de leads para clínicas de
tratamento e transplante capilar (rede Homenz). Stack: React + Vite + tRPC +
Drizzle ORM, com bancos TiDB (MySQL) e Supabase (Postgres), e processamento de
imagem em Python/OpenCV.

---

## 1. Escopo solicitado (briefing)

1.1. Evoluir o projeto existente sem reescrever do zero, preservando a base já desenvolvida.
1.2. Aprimorar o visual mantendo a identidade da marca.
1.3. Garantir o fluxo do lead funcionando de ponta a ponta (onboarding → quiz → foto → tratamento por IA → agendamento).
1.4. Disponibilizar acompanhamento do lead pelo gestor em todas as etapas até o atendimento presencial.
1.5. Permitir acionamento do lead via WhatsApp.
1.6. Itens detalhados em reunião de alinhamento: correção do fluxo de captura da landing, white-label por franquia, rastreamento via Pixel Meta, ficha completa do lead (CRM), encerramento de atendimento e link de WhatsApp do gestor.

---

## 2. Frontend e design (landing pages e funis)

2.1. **Landing page principal do SaaS (rota `/`)** — redesign completo da página de vendas da plataforma: hierarquia tipográfica revista, sistema de ícones padronizado (Phosphor duotone), ritmo de seções (timeline conectada, grid bento com diversidade visual), animações de entrada por scroll (scroll-reveal) com respeito a `prefers-reduced-motion`.

2.2. **Acabamento premium da landing principal** — fundo do hero com aurora animada (luz volumétrica em movimento orgânico na paleta da marca), profundidade de material (sombras em camadas, brilho especular, grain sutil), microinterações (tilt 3D nos cards, contador animado, parallax de mouse) e pills no padrão *liquid-glass* aplicados de forma consistente em botões, badges e selos.

2.3. **Correção de responsividade da navegação** — barra de navegação reestruturada para não quebrar em larguras intermediárias (tablet), com colapso controlado de itens e carrossel de um card por vez no mobile.

2.4. **Funil de captação da franquia (rota `/l/:slug`)** — redesign e ajuste da dinâmica de conversão: captura de nome e WhatsApp antes do quiz, perguntas de diagnóstico, microrreforços entre etapas e barra de escassez. Correção de bug que ocultava os botões de resposta a partir da segunda pergunta.

2.5. **Funil de captação da clínica (rota `/c/:slug`)** — seis telas (landing, chat, envio de fotos, resultado, agendamento e confirmação) tematizadas e padronizadas visualmente.

2.6. **Sistema de tema do funil (claro/escuro)** — tokens de design em OKLCH, alternância de tema e tematização escopada, sem afetar o painel administrativo.

2.7. **Documentação de design** — definição de princípios de produto e sistema visual (cores da marca, tipografia, raios, espaçamento, motion, acessibilidade WCAG AA) registrados como referência do projeto.

---

## 3. Funcionalidades do funil de captação

3.1. **Captura de lead antes do quiz** — correção do fluxo para exibir a landing e capturar contato (nome + WhatsApp) antes de iniciar o diagnóstico.

3.2. **White-label por franquia** — cada unidade edita textos, endereço, fotos e identificadores de campanha da sua landing dentro de uma estrutura padrão, via interface administrativa.

3.3. **Rastreamento via Pixel Meta** — disparo de eventos (PageView e ViewContent) por página, com campo de ID de pixel configurável por landing.

3.4. **Ficha completa do lead (CRM)** — exibição consolidada de tudo que o lead preencheu (tipo de queda, objetivo, tempo, demais respostas do quiz), fotos enviadas e histórico de antes/depois, além do bloco de agendamento.

3.5. **Antes/depois por IA** — motor de geração do resultado capilar integrado ao funil e à ficha do lead.

3.6. **Temperatura do lead** — classificação automática (frio, morno, quente) por etapa concluída e pontuação calculada a partir das respostas do quiz.

3.7. **Distribuição de leads** — atribuição automática (round-robin) de leads aos vendedores da unidade.

3.8. **Encerramento de atendimento** — registro de status final (resolvido, fechou, não fechou, contato futuro) com campo de observações.

3.9. **Acionamento por WhatsApp** — link direto (wa.me) na ficha do lead, no dashboard e na agenda, para abordagem imediata pelo gestor/vendedor.

---

## 4. Painel administrativo

4.1. Modal de edição de landing reescrito como componente reutilizável e totalmente responsivo.

4.2. Navegação por abas padronizada (substituição de emojis por ícones), listas de leads e telas de configuração de landing e pixel revistas.

4.3. Padronização de botões primários e barras de progresso na paleta da marca, com contraste acessível.

---

## 5. Refatoração e boas práticas de engenharia de software

5.1. **Quebra de *god file* na camada de API** — arquivo monolítico de rotas (2.162 linhas) decomposto em 15 routers por domínio mais um módulo compartilhado, aplicando separação de responsabilidades e modularização por contexto de negócio.

5.2. **Decomposição de componente monolítico no frontend** — painel de 2.119 linhas (com 31 estados locais) refatorado para ~516 linhas, extraindo componentes coesos e reutilizáveis (componentes de vendedor, configurações, gestão de landings e pixel), aplicando composição de componentes e responsabilidade única.

5.3. **Remoção de código morto** — eliminação de arquivos obsoletos, telas de demonstração em produção e scripts soltos no diretório raiz.

5.4. **Validação de entrada** — schema de validação (Zod) presente em 100% dos endpoints, garantindo contrato de dados consistente.

5.5. **Isolamento multi-tenant** — separação por identificador de clínica verificada em ~50 endpoints, sem vazamento de dados entre unidades.

5.6. **Garantias de qualidade contínuas** — verificação de tipos (TypeScript, zero erros) e build de produção validados a cada entrega; testes da camada de aplicação executados.

---

## 6. Arquitetura e auditoria

6.1. **Auditoria técnica completa** — avaliação por área (modelo de dados, validação, backend, frontend, segurança) com parecer de continuidade evolutiva em vez de reescrita.

6.2. **Mapeamento da arquitetura de dados** — documentação da operação sobre dois bancos paralelos (funil/admin em TiDB; franqueado/landing em Supabase) e das implicações para cada funcionalidade.

6.3. **Levantamento de segurança** — identificação de credenciais em texto plano no histórico e de segredo com valor padrão fixo em código, com recomendações de saneamento.

---

## 7. Infraestrutura, build e deploy

7.1. **Containerização** — Dockerfile unificando Node, build do frontend (Vite) e dependências de sistema para o processamento de imagem em Python/OpenCV, viabilizando o motor de antes/depois fora de ambientes serverless.

7.2. **Ajustes de build** — exposição das variáveis de frontend em tempo de build e correção da ordem de cópia de dependências com patch.

7.3. **Migração de banco** — aplicação das alterações de schema (colunas de white-label e conteúdo) no Supabase.

7.4. **Deploy de validação** — publicação da aplicação completa (frontend, backend e processamento de imagem) em provedor de container, com domínio público para homologação e configuração das variáveis de ambiente.

---

## 8. Pendências e observações técnicas

8.1. Chave de serviço de e-mail transacional inválida — e-mails (recuperação de senha, boas-vindas) não são entregues até a substituição da credencial.

8.2. Gateway de pagamento em modo de teste — requer troca para credenciais de produção antes da operação real.

8.3. Domínio próprio — recomendação de uso de subdomínio do domínio institucional apontado por DNS para o ambiente publicado, sem necessidade de aquisição de novo domínio.

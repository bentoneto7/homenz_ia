# Design

Sistema visual do **funil público Homenz** (landing pages `/c/:slug` e `/l/:slug`). Escopado sob a classe `.funnel-theme` — **não** afeta o tema do painel admin (que segue claro/Inter/Montserrat). Direção: *navy cirúrgica premium*.

## Theme

Dark, navy profundo. Cena: um homem 35-60, no celular, à noite, decidindo discretamente se trata a calvície. O fundo escuro reduz a exposição (sensação de privacidade) e faz a prova visual (antes/depois) e o CTA laranja saltarem. Não é "dark porque tech"; é discrição + foco no resultado.

Estratégia de cor: **Committed** — o navy carrega a superfície inteira; o teal Homenz (`#00C1B8`, cor-assinatura da marca) aparece só no CTA e em micro-destaques (≤10%). O navy NÃO é o azul-clínico claro com gradiente (que dava "cara de IA"): é o azul da marca (`#01499B`/`#004A9D`) escurecido, premium, com o teal vibrante por cima.

## Color (OKLCH, escopado em `.funnel-theme`)

| Token | OKLCH | ~Hex | Uso |
|---|---|---|---|
| `--fn-bg` | `oklch(0.17 0.028 252)` | `#0A1622` | Fundo base da página |
| `--fn-surface` | `oklch(0.21 0.030 252)` | `#0D1B2A` | Seções, faixas |
| `--fn-elevated` | `oklch(0.27 0.034 252)` | `#15293D` | Cards, inputs, superfícies elevadas |
| `--fn-ink` | `oklch(0.97 0.006 250)` | `#F4F7FB` | Títulos, texto forte |
| `--fn-body` | `oklch(0.88 0.012 250)` | `#DBE3EC` | Corpo de texto (≥4.5:1 no surface) |
| `--fn-muted` | `oklch(0.72 0.020 250)` | `#9DAFC0` | Legendas, labels (≥4.5:1 no surface) |
| `--fn-accent` | `oklch(0.72 0.135 185)` | `#00C1B8` | CTA, destaques, foco (teal Homenz) |
| `--fn-accent-press` | `oklch(0.64 0.130 185)` | `#00A39B` | CTA hover/active |
| `--fn-accent-ink` | `oklch(0.21 0.030 245)` | `#0A2540` | Texto sobre o teal (azul-marinho Homenz) |
| `--fn-line` | `oklch(1 0 0 / 0.10)` | branco 10% | Bordas sutis |
| `--fn-line-strong` | `oklch(1 0 0 / 0.18)` | branco 18% | Bordas de input/foco |
| `--fn-success` | `oklch(0.78 0.15 165)` | verde | Selos de confiança, sucesso |

Regra: texto cinza nunca "lavado" — `--fn-muted` é o piso de contraste (≥4.5:1). O laranja é o único saturado; nada de gradiente azul.

## Typography

- **Display (`--fn-font-display`): Clash Display** (Fontshare) — títulos H1-H3, pesos 500-700. Geométrico, encorpado, masculino. `letter-spacing: -0.02em`, `text-wrap: balance`.
- **Corpo (`--fn-font-body`): Hanken Grotesk** (Google) — texto, labels, botões, inputs. Pesos 400-700. Grotesca limpa e legível (público 40+).
- Escala fluida `clamp()`, ratio ≥1.25. H1 hero: `clamp(2.5rem, 6vw, 4rem)` (~40→64px). Teto display ≤ 6rem.
- Sem all-caps em corpo. Uppercase só em labels curtos (selos, eyebrow de seção usado com parcimônia).
- Light-on-dark: `line-height` do corpo +0.05 (texto claro pesa menos).

## Radius & Form

Compromisso com a forma (anti-"cara de IA" do `rounded-2xl` morno):
- CTA e chips: **pill total** (`--fn-r-pill: 999px`).
- Cards, inputs, imagens: **reto suave** (`--fn-r-card: 14px`), consistente.
- Sem sombras decorativas; profundidade por `--fn-elevated` + `--fn-line`. Glow laranja sutil só no CTA primário (intencional).

## Components

- **CTA primário:** fundo `--fn-accent`, texto `--fn-accent-ink`, pill, peso 700, com seta. Hover → `--fn-accent-press` + leve glow. Foco visível (`--fn-accent` ring).
- **Card de captura:** `--fn-elevated`, borda `--fn-line`, raio card. Inputs `--fn-bg` com borda `--fn-line-strong`, foco laranja.
- **Urgency bar:** faixa fina topo, `--fn-surface`, texto `--fn-muted` com número em `--fn-ink`. Discreta, não vermelho-pânico.
- **Galeria antes/depois:** seção-herói, fotos reais lado a lado com label "Antes"/"Depois", raio card. É o ativo de conversão nº 1.
- **Selos de confiança:** ícone + label curto, `--fn-muted`, sem caixa.

## Motion

- Entrada do hero: reveal sutil (opacity + translateY 8px, ease-out-expo, stagger leve). Conteúdo visível por padrão (reveal realça, não esconde).
- CTA: transição de cor 150ms + glow no hover.
- `@media (prefers-reduced-motion: reduce)`: crossfade/instantâneo.
- Carrossel de depoimentos: fade suave (já existe), respeitando reduced-motion.

## White-label (franquia)

O `theme` no `content` JSONB pode sobrescrever `--fn-accent`/`--fn-surface` por franquia, mantendo a estrutura e o contraste. Default = navy+laranja acima.

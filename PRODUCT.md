# Product

## Register

brand

## Users

Homens (maioria 35-60 anos) com queda capilar ou calvície em algum grau Norwood. Chegam à landing pelo celular, vindos de anúncio pago (Meta/pixel) ou link enviado por um vendedor da franquia. Contexto emocional: insegurança e autoestima abalada, com um tabu em torno do assunto. O que querem descobrir, sem constrangimento e sem compromisso, é se ainda há solução para o caso deles, e como ficariam depois de um tratamento.

Job to be done: "Quero ver, de forma rápida e discreta, se tem solução pro meu cabelo e como eu ficaria, antes de falar com alguém."

## Product Purpose

Landing pages de captação de leads do funil capilar da marca **Homenz**. Duas variantes da mesma experiência: funil da **clínica** (`/c/:slug`, banco TiDB) e funil da **franquia** (`/l/:slug`, banco Supabase, white-label por franquia). O objetivo de cada página é converter o visitante em **lead qualificado**: captura nome + WhatsApp, conduz a um quiz de diagnóstico, recebe a foto, gera uma análise capilar + antes/depois por IA (o clímax/prova), e encaminha pra avaliação com um especialista.

Sucesso = taxa de captura alta + lead que chega ao vendedor com foto, dados e análise. A landing da franquia precisa ter a **mesma estrutura rica** da clínica, mas editável por franquia (white-label) dentro de uma estrutura fixa.

## Brand Personality

**Clínico, confiante e discreto.** Autoridade médica que resolve sem drama e sem constrangimento. A voz é séria, direta e baseada em resultado e tempo ("avaliação em 2 minutos", "resultados em 3-6 meses"), nunca vendedora ou apelativa. Desmistifica o tabu da calvície tratando como assunto normal e tratável. Referências de tom: Manual e Hims (clínico acessível), Smile Hair Clinic (clínica premium). Masculino sem ser agressivo; premium sem ser arrogante.

## Anti-references

- **"Cara de IA"** genérica: o pecado capital. A versão atual sofre disso.
- **Azul-clínico clichê** (`#004A9D`) e o gradiente azul-bebê `#EBF4FF→white→#F0FDF9`.
- Cantos `rounded-2xl` mornos sem compromisso com a forma.
- Ícones/emoji genéricos no lugar de fotos reais e galeria antes/depois.
- Fonte default (Inter/system) com H1 pequeno e tímido.
- Microcopy vaga ("Saiba mais") em vez de verbo de ação + número/tempo.
- Tom de "oferta agressiva"/escassez performática como voz dominante.

## Design Principles

1. **A prova é o herói.** O antes/depois real (ou gerado por IA, padronizado em ângulo/luz) é o ativo de conversão nº 1, tratado como seção-destaque, não enfeite. Mostrar, não prometer.
2. **Discrição vende.** Reduzir o atrito emocional: "sem sala de espera, sem conversa constrangedora, 100% online". O homem precisa sentir que pode olhar sem se expor.
3. **Específico, não genérico.** Número + tempo no lugar de adjetivo. "Avaliação em 2 minutos" > "rápido e fácil". Cada palavra e cada selo carrega um fato concreto.
4. **Estrutura única, conteúdo personalizável.** Uma estrutura de seções fixa e bem desenhada, dirigida por dados (`content` JSONB), que cada franquia personaliza sem quebrar a identidade.
5. **Confiança clínica sem azul clichê.** Autoridade transmitida por navy premium + acento quente, tipografia com caráter e prova visual, não pela paleta óbvia do setor de saúde.

## Accessibility & Inclusion

WCAG AA: contraste de corpo ≥4.5:1 (atenção redobrada com texto sobre navy e em placeholders), alvos de toque generosos (público mobile, parte 40+), navegação por teclado nos formulários, e alternativa para `prefers-reduced-motion` em toda animação. Mobile-first: a maioria chega pelo celular via anúncio.

/**
 * Modelo de conteúdo da landing do funil (white-label por franquia).
 *
 * Design pattern: "conteúdo como dado". A estrutura visual é fixa (as 8 seções
 * documentadas em DESIGN.md); cada franquia personaliza o CONTEÚDO dentro dela.
 * `DEFAULT_CONTENT` é o fallback Homenz; `resolveLandingContent` sobrepõe os
 * campos editáveis vindos da landing_page (Supabase) sobre o default.
 *
 * Hoje os campos editáveis são as colunas já existentes (hero_*, cta_text,
 * gallery_photos, custom_*). As seções ainda não editáveis (urgency, prova
 * social, "como funciona", depoimentos) usam o default e podem virar editáveis
 * via um `content` JSONB num passo futuro, sem mudar este contrato.
 */

export interface LandingTrustSeal {
  icon: "shield" | "clock" | "lock" | "gift" | "check";
  label: string;
}

export interface LandingStep {
  icon: "search" | "camera" | "sparkles" | "calendar";
  title: string;
  desc: string;
}

export interface LandingTestimonial {
  name: string;
  age: number;
  city: string;
  text: string;
  /** Foto do cliente. No demo usa retrato público (placeholder); produção = cliente real. */
  avatarUrl?: string;
}

export interface LandingBeforeAfter {
  beforeUrl: string;
  afterUrl: string;
  caption?: string;
}

/** Cores white-label (override do tema navy padrão). Strings CSS (hex/oklch). */
export interface LandingTheme {
  accent?: string;
  surface?: string;
}

export interface LandingContent {
  /** Faixa de urgência no topo. `{city}` é substituído pela cidade da unidade. */
  urgency: { enabled: boolean; text: string };
  hero: {
    badge: string;
    headline: string;
    /** Trecho do headline destacado em laranja (deve existir dentro de headline). */
    highlight: string;
    subtitle: string;
    imageUrl?: string;
  };
  socialProof: { enabled: boolean; count: number; text: string; avatars: string[] };
  capture: { title: string; subtitle: string; ctaText: string };
  trust: LandingTrustSeal[];
  howItWorks: LandingStep[];
  testimonials: LandingTestimonial[];
  beforeAfter: LandingBeforeAfter[];
  theme?: LandingTheme;
}

export const DEFAULT_CONTENT: LandingContent = {
  urgency: {
    enabled: true,
    text: "Vagas limitadas para avaliação capilar gratuita esta semana em {city}",
  },
  hero: {
    badge: "Avaliação capilar com IA",
    headline: "Veja seu cabelo daqui a alguns meses, antes de decidir",
    highlight: "antes de decidir",
    subtitle:
      "Análise capilar especializada em 2 minutos, a partir de uma foto. Discreto, sem compromisso e 100% online.",
  },
  socialProof: {
    enabled: true,
    count: 847,
    // A view prefixa "+{count} homens" — o texto NÃO deve repetir "homens"
    text: "já fizeram a avaliação este mês",
    // Placeholders públicos (randomuser.me). Produção: clientes reais via editor.
    avatars: [
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/men/45.jpg",
      "https://randomuser.me/api/portraits/men/67.jpg",
      "https://randomuser.me/api/portraits/men/12.jpg",
    ],
  },
  capture: {
    title: "Comece sua avaliação",
    subtitle: "Leva 2 minutos. Sem cartão, sem compromisso.",
    ctaText: "Começar avaliação gratuita",
  },
  trust: [
    { icon: "lock", label: "Dados protegidos" },
    { icon: "clock", label: "Leva 2 minutos" },
    { icon: "gift", label: "100% gratuito" },
  ],
  howItWorks: [
    { icon: "search", title: "Diagnóstico", desc: "Responda algumas perguntas rápidas" },
    { icon: "camera", title: "Sua foto", desc: "Envie uma foto da área que te preocupa" },
    { icon: "sparkles", title: "Resultado por IA", desc: "Veja seu potencial de resultado na hora" },
    { icon: "calendar", title: "Avaliação", desc: "Agende com um especialista, sem custo" },
  ],
  testimonials: [
    { name: "Carlos M.", age: 42, city: "Uberaba", text: "Achei que era tarde demais. Depois da avaliação vi que tinha solução, e recuperei minha confiança.", avatarUrl: "https://randomuser.me/api/portraits/men/75.jpg" },
    { name: "Roberto A.", age: 38, city: "Uberlândia", text: "Ver como eu ia ficar antes de decidir foi o que me convenceu. Processo discreto, sem pressão.", avatarUrl: "https://randomuser.me/api/portraits/men/41.jpg" },
    { name: "Marcos L.", age: 51, city: "Uberaba", text: "Resultado natural, ninguém percebe que fiz algo. Só percebem que estou mais jovem.", avatarUrl: "https://randomuser.me/api/portraits/men/86.jpg" },
  ],
  beforeAfter: [],
};

type LandingPageRecord = Record<string, unknown> | null | undefined;

/** Lê um array de strings de um campo JSONB (gallery_photos) com segurança. */
function readGallery(value: unknown): LandingBeforeAfter[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): LandingBeforeAfter | null => {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const before = typeof o.beforeUrl === "string" ? o.beforeUrl : typeof o.before === "string" ? o.before : "";
        const after = typeof o.afterUrl === "string" ? o.afterUrl : typeof o.after === "string" ? o.after : "";
        if (before && after) return { beforeUrl: before, afterUrl: after, caption: typeof o.caption === "string" ? o.caption : undefined };
      }
      return null;
    })
    .filter((x): x is LandingBeforeAfter => x !== null);
}

/**
 * Sobrepõe os campos editáveis da landing_page sobre o DEFAULT_CONTENT.
 * `city` substitui o token {city} na faixa de urgência.
 */
export function resolveLandingContent(lp: LandingPageRecord, city?: string): LandingContent {
  const o = (lp ?? {}) as Record<string, unknown>;
  const str = (k: string): string | undefined => (typeof o[k] === "string" && o[k] ? (o[k] as string) : undefined);

  const headline = str("hero_title") ?? DEFAULT_CONTENT.hero.headline;
  const customHighlight = str("hero_highlight");
  // Se a franquia customizou o headline mas não o highlight, não força destaque inexistente.
  const highlight = customHighlight ?? (headline === DEFAULT_CONTENT.hero.headline ? DEFAULT_CONTENT.hero.highlight : "");

  return {
    urgency: {
      enabled: DEFAULT_CONTENT.urgency.enabled,
      text: (str("urgency_text") ?? DEFAULT_CONTENT.urgency.text).replace("{city}", city ?? "sua cidade"),
    },
    hero: {
      badge: str("hero_badge") ?? DEFAULT_CONTENT.hero.badge,
      headline,
      highlight,
      subtitle: str("hero_subtitle") ?? DEFAULT_CONTENT.hero.subtitle,
      imageUrl: str("hero_image_url"),
    },
    socialProof: DEFAULT_CONTENT.socialProof,
    capture: {
      title: DEFAULT_CONTENT.capture.title,
      subtitle: DEFAULT_CONTENT.capture.subtitle,
      ctaText: str("cta_text") ?? DEFAULT_CONTENT.capture.ctaText,
    },
    trust: DEFAULT_CONTENT.trust,
    howItWorks: DEFAULT_CONTENT.howItWorks,
    testimonials: DEFAULT_CONTENT.testimonials,
    beforeAfter: readGallery(o.gallery_photos),
    theme: {
      accent: str("theme_accent"),
      surface: str("theme_surface"),
    },
  };
}

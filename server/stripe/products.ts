/**
 * Homenz — Planos de Assinatura
 * Preços em centavos (BRL).
 * Os Price IDs são criados dinamicamente no checkout se não existirem.
 */

export const HOMENZ_PLANS = {
  starter: {
    id: "starter",
    name: "Unidade Starter",
    description: "Ideal para franquias em fase de lançamento",
    price: 79700, // R$ 797/mês
    interval: "month" as const,
    features: [
      "Até 100 leads/mês",
      "1 landing page de captação",
      "Funil de diagnóstico capilar IA",
      "Painel do franqueado",
      "Suporte por e-mail",
    ],
    highlight: false,
  },
  pro: {
    id: "pro",
    name: "Unidade Pro",
    description: "Para franquias que querem crescer rápido",
    price: 149700, // R$ 1.497/mês
    interval: "month" as const,
    features: [
      "Leads ilimitados",
      "Landing pages ilimitadas",
      "Funil de diagnóstico capilar IA",
      "Painel do franqueado + vendedores",
      "Distribuição automática de leads (round-robin)",
      "Analytics de conversão por vendedor",
      "Alertas de temperatura de lead",
      "Suporte prioritário via WhatsApp",
    ],
    highlight: true,
    badge: "Mais popular",
  },
  network: {
    id: "network",
    name: "Rede Completa",
    description: "Para donos de rede com múltiplas franquias",
    price: 349700, // R$ 3.497/mês
    interval: "month" as const,
    features: [
      "Tudo do Pro",
      "Painel do Dono da Rede",
      "Gestão centralizada de franquias",
      "Relatórios consolidados",
      "API de integração",
      "Onboarding dedicado",
      "SLA de suporte 4h",
    ],
    highlight: false,
  },
} as const;

export type PlanId = keyof typeof HOMENZ_PLANS;

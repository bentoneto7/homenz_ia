import { Flame, Thermometer, Snowflake, TimerOff, type LucideIcon, type LucideProps } from "lucide-react";

/** Ícone Lucide de cada temperatura de lead (substitui 🔥 🌡️ 🧊 💀). */
export const TEMPERATURE_ICONS: Record<"hot" | "warm" | "cold" | "frozen", LucideIcon> = {
  hot: Flame,
  warm: Thermometer,
  cold: Snowflake,
  frozen: TimerOff,
};

/** Cor padrão de cada temperatura para fundo claro (painéis). */
export const TEMPERATURE_ICON_COLOR: Record<"hot" | "warm" | "cold" | "frozen", string> = {
  hot: "text-orange-500",
  warm: "text-amber-500",
  cold: "text-sky-500",
  frozen: "text-slate-400",
};

interface Props extends LucideProps {
  temperature: string | null | undefined;
  /** false = herda a cor do texto pai em vez da cor da temperatura */
  colored?: boolean;
}

export function LeadTemperatureIcon({ temperature, colored = true, className = "w-4 h-4", ...rest }: Props) {
  const key = (temperature && temperature in TEMPERATURE_ICONS ? temperature : "cold") as keyof typeof TEMPERATURE_ICONS;
  const Icon = TEMPERATURE_ICONS[key];
  return <Icon aria-hidden="true" className={`${className} ${colored ? TEMPERATURE_ICON_COLOR[key] : ""}`.trim()} {...rest} />;
}

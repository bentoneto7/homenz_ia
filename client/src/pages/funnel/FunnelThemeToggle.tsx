import { Sun, Moon } from "@phosphor-icons/react";
import type { FunnelMode } from "./useFunnelTheme";

/**
 * Botão sol/lua para alternar o tema do funil (dark/light).
 * Mostra o ícone do tema PARA O QUAL vai trocar. Usa tokens `--fn-*`,
 * então fica correto nos dois modos. Deve ficar dentro de `.funnel-theme`.
 */
export function FunnelThemeToggle({
  mode,
  onToggle,
  className = "",
}: {
  mode: FunnelMode;
  onToggle: () => void;
  className?: string;
}) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--fn-line-strong)] bg-[var(--fn-elevated)] text-[var(--fn-accent)] transition-colors hover:border-[var(--fn-accent)] focus-visible:outline-none ${className}`}
    >
      {isDark ? (
        <Sun size={18} weight="duotone" />
      ) : (
        <Moon size={18} weight="duotone" />
      )}
    </button>
  );
}

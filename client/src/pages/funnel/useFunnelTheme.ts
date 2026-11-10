import { useCallback, useEffect, useState } from "react";

export type FunnelMode = "dark" | "light";

const STORAGE_KEY = "fn-theme";

function readStored(): FunnelMode {
  if (typeof window === "undefined") return "light";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "dark" ? "dark" : "light";
}

/**
 * Tema do funil público (dark/light) com toggle persistido.
 * Aplica o atributo `data-fn-theme` no <html> — todos os elementos `.funnel-theme`
 * respondem de uma vez (ver tokens em index.css). Default: dark (premium).
 */
export function useFunnelTheme() {
  const [mode, setMode] = useState<FunnelMode>(readStored);

  useEffect(() => {
    document.documentElement.setAttribute("data-fn-theme", mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
    // Não limpamos no unmount: o atributo só afeta `.funnel-theme` (admin não usa),
    // e remover causaria flash ao navegar entre telas do funil.
  }, [mode]);

  const toggle = useCallback(
    () => setMode(m => (m === "dark" ? "light" : "dark")),
    []
  );

  return { mode, toggle };
}

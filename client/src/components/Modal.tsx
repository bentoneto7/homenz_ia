import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Botões de ação, fixos no rodapé (sempre visíveis enquanto o corpo rola). */
  footer?: ReactNode;
  size?: "md" | "lg";
};

/**
 * Modal responsivo do painel: header fixo + corpo rolável + footer fixo.
 * No mobile vira bottom-sheet (encostado embaixo, cantos arredondados no topo),
 * garantindo que os botões de ação nunca saiam da tela mesmo com muitos campos.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  // Fecha no Esc e trava o scroll do fundo enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === "lg" ? "sm:max-w-lg" : "sm:max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#E2E8F0] bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl ${maxW}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header fixo */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-6 pb-4 pt-6">
          <div className="min-w-0">
            <h3
              className="text-xl font-bold text-[#0A2540]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-[#5A667A]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 rounded-lg p-1 text-[#A0AABB] transition-colors hover:bg-[#F0F4F8] hover:text-[#0A2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer fixo */}
        {footer && (
          <div className="flex gap-3 border-t border-[#E2E8F0] bg-white px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

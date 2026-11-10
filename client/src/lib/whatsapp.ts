/**
 * Monta um link wa.me a partir de um telefone brasileiro e uma mensagem opcional.
 * Normaliza o número (só dígitos) e garante o DDI 55.
 */
export function buildWhatsappUrl(
  phone: string | null | undefined,
  message?: string,
): string {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  // Números locais brasileiros têm 10-11 dígitos (DDD + número). Prefixa o DDI.
  if (digits.length <= 11) digits = `55${digits}`;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Saudação padrão para o primeiro contato do gestor/vendedor com um lead. */
export function defaultLeadGreeting(leadName: string | null | undefined): string {
  const first = (leadName ?? "").trim().split(" ")[0];
  const hi = first ? `Olá ${first}!` : "Olá!";
  return `${hi} 😊 Aqui é da clínica. Vi seu interesse no diagnóstico capilar e quero te ajudar a agendar sua avaliação. Posso te passar os horários disponíveis?`;
}

/**
 * Wordmark vetorial do funil — "HOMENZ" + símbolo masculino (♂).
 * Substitui o logo raster (fundo branco) como default quando a franquia não
 * subiu um logo próprio. Vetorial = nítido em qualquer tamanho, transparente.
 *
 * O TEXTO "HOMENZ" herda `--fn-ink` (varia: branco em fundo escuro, navy em
 * fundo claro). O símbolo ♂ é TRAVADO na cor de marca (teal #00C1B8) por padrão
 * para ficar consistente em TODAS as telas — antes ele herdava `--fn-accent`,
 * que muda de tela pra tela (teal no painel navy, azul no claro, etc.) e deixava
 * o ♂ com cores diferentes. O teal contrasta bem tanto em navy quanto em branco.
 * Passe `accentColor` para forçar outra cor num contexto específico.
 */

const BRAND_MARS = "#00C1B8"; // teal Homenz — cor única do símbolo ♂

export default function FunnelWordmark({
  height = 28,
  accentColor = BRAND_MARS,
}: {
  height?: number;
  accentColor?: string;
}) {
  const fontSize = height * 0.84;
  const mars = fontSize * 0.62;
  return (
    <span
      className="inline-flex items-center select-none"
      style={{ fontFamily: "var(--fn-font-display)", height, lineHeight: 1 }}
      aria-label="Homenz"
    >
      <span style={{ color: "var(--fn-ink)", fontWeight: 700, fontSize, letterSpacing: "-0.045em" }}>
        HOMENZ
      </span>
      <svg
        viewBox="0 0 24 24"
        width={mars}
        height={mars}
        fill="none"
        style={{ color: accentColor, marginLeft: -fontSize * 0.05, marginBottom: fontSize * 0.28 }}
        aria-hidden="true"
      >
        <circle cx="9" cy="15" r="5.4" stroke="currentColor" strokeWidth="2.4" />
        <path d="M12.8 11.2 19.5 4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M14.5 4.5H19.5V9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

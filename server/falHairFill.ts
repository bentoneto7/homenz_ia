/**
 * Gera o "depois" do antes/depois capilar usando fal.ai nano-banana-pro/edit (EDIÇÃO de imagem).
 * Histórico dos motores: o Gemini flash-image direto regenerava a imagem inteira e era
 * inconsistente; o flux-pro/kontext preservava bem mas NÃO reconstruía a linha do cabelo
 * (só "penteava" — a recessão em M continuava lá, mesmo com guidance 5 e kontext/max).
 * O nano-banana-pro/edit é o único que preenche as têmporas/linha frontal de verdade
 * preservando identidade, penteado e fundo (validado 02/07 em foto real + calvície acentuada).
 * Custo: ~$0.15/imagem (kontext era $0.04).
 *
 * Requer FAL_KEY nas envs (fal.ai/dashboard/keys).
 */

const ENDPOINT = "https://fal.run/fal-ai/nano-banana-pro/edit";

// Prompt CURTO de propósito: versões longas cheias de cláusulas de preservação diluíam a
// instrução principal e o modelo só "penteava" (as entradas em M continuavam). Validado
// 02/07 com zoom na linha do cabelo, em foto real (entradas) e calvície acentuada (Norwood 5-6).
const HAIR_PROMPT =
  "Give this man the result of a successful hair transplant, editing ONLY the hair on top of his head. " +
  "Wherever there is bald or thinning scalp, thick natural hair now grows from the skin. His hairline is " +
  "completely rebuilt: LOW, STRAIGHT and juvenile, with ZERO temple recession — the bald corners at his " +
  "temples are FULLY covered with hair, so the hairline forms one continuous line across the forehead and " +
  "his forehead looks visibly smaller. The top and crown are fully covered with dense hair. Match his " +
  "existing hair color and texture and keep his current hairstyle — not a wig, no tall quiff or pompadour. " +
  "His beard, stubble and facial hair stay EXACTLY as they are — do NOT add, thicken or trim any facial " +
  "hair. Keep his face, identity, expression, clothes, pose, lighting and background exactly the same.";

export async function falHairFill(imageUrl: string): Promise<Buffer> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada");

  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: HAIR_PROMPT, image_urls: [imageUrl] }),
  });
  if (!resp.ok) {
    throw new Error(`fal ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  }

  const data: any = await resp.json();
  const outUrl = data?.images?.[0]?.url;
  if (!outUrl) throw new Error("fal não retornou imagem");

  const imgResp = await fetch(outUrl);
  if (!imgResp.ok) throw new Error(`Falha ao baixar resultado fal: ${imgResp.status}`);
  return Buffer.from(await imgResp.arrayBuffer());
}

/**
 * Gera o "depois" do antes/depois capilar usando o Gemini (edição de imagem),
 * adicionando cabelo de forma realista e PRESERVANDO o rosto/identidade do lead.
 * Substitui o processamento OpenCV (hair_processor.py), que só adensava o existente.
 *
 * Calibrado para o que a clínica entrega (micropigmentação / fibras): resultado
 * denso e natural, não um cabelo de galã — para não prometer transplante.
 */

const MODEL = "gemini-2.5-flash-image";

const HAIR_PROMPT =
  "You are generating the 'AFTER' photo of a realistic hair-restoration result on the SAME person, with a " +
  "CLEARLY VISIBLE improvement. You may edit ONLY the scalp hair, and you MUST KEEP THE SAME HAIRSTYLE: same " +
  "haircut, same length, same parting line and hair direction, same texture/wave and the SAME natural hair color. " +
  "DO THIS: wherever there is bald or thinning scalp — a receded hairline, bald temple corners, a thin or bald " +
  "top, a bald crown — grow dense, natural NEW hair from the skin. Rebuild a LOW, STRAIGHT, youthful hairline " +
  "across the whole forehead: the front edge of the hair must sit clearly lower, with both temple corners FULLY " +
  "COVERED, leaving NO bald recession. This is NOT about combing or styling the existing hair differently — it " +
  "is new hair growing where there is currently visible scalp. Compared side by side with the original, the " +
  "person must OBVIOUSLY have more hair coverage and a younger, lower, fuller hairline — never less hair, " +
  "always in the SAME style. " +
  "ABSOLUTE RULES (critical): " +
  "1) Do NOT restyle or invent a new haircut. Do NOT add a tall quiff, pompadour, topknot or extra height/volume. " +
  "Do NOT make it look like a wig, toupee or hairpiece. NEVER remove, shorten, shave, trim or recede the " +
  "existing hair. The 'after' must NEVER have less hair than the original. " +
  "2) Do NOT add, remove or change beard, mustache or any facial hair — keep it IDENTICAL to the original. " +
  "3) Do NOT change the person's identity or face in any way: keep the exact same facial features (eyes, " +
  "nose, mouth, jaw, cheeks), the same skin tone and texture, the same age and ethnicity, the same " +
  "expression, and the same glasses. Do NOT beautify, slim, smooth, retouch or restyle the face. " +
  "4) Do NOT change clothing, other people, lighting, shadows or background. Preserve the exact same " +
  "camera angle, head pose, framing, zoom and resolution. Everything outside the scalp hair must stay " +
  "pixel-identical to the original. " +
  "Photorealistic and natural: the SAME hair visibly regrown denser with a restored hairline, not a new hairstyle, not a wig.";

export async function geminiHairFill(imageUrl: string): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  // baixa a foto base (foto frontal do lead)
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`Falha ao baixar foto base: ${imgResp.status}`);
  const mime = imgResp.headers.get("content-type") || "image/jpeg";
  const b64 = Buffer.from(await imgResp.arrayBuffer()).toString("base64");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: HAIR_PROMPT },
            { inline_data: { mime_type: mime, data: b64 } },
          ],
        },
      ],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  }

  const data: any = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p.inline_data || p.inlineData;
    if (inline?.data) return Buffer.from(inline.data, "base64");
  }
  throw new Error("Gemini não retornou imagem");
}

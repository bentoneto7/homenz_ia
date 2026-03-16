/**
 * Image generation helper usando OpenAI DALL-E 3 (edits via gpt-image-1)
 *
 * Variáveis de ambiente necessárias:
 *   OPENAI_API_KEY  — chave da OpenAI
 *   OPENAI_BASE_URL — (opcional) URL base customizada (ex: proxy)
 *
 * Exemplo de uso:
 *   const { url } = await generateImage({ prompt: "..." });
 *   const { url } = await generateImage({ prompt: "...", originalImages: [{ url: "https://..." }] });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

async function fetchImageAsBase64(imageUrl: string): Promise<{ b64: string; mimeType: string }> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  const mimeType = resp.headers.get("content-type") ?? "image/jpeg";
  return { b64: Buffer.from(buffer).toString("base64"), mimeType };
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const baseUrl = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? ENV.forgeApiUrl.replace(/\/$/, "")
    : "https://api.openai.com/v1";

  const hasOriginalImages = options.originalImages && options.originalImages.length > 0;

  let b64Json: string;
  let mimeType = "image/png";

  if (hasOriginalImages) {
    // Usar gpt-image-1 (edits) quando há imagens originais
    // Node.js 18+ tem FormData nativo via globalThis
    const form = new globalThis.FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", options.prompt);
    form.append("n", "1");
    form.append("size", "1024x1024");

    // Buscar e adicionar imagens originais
    for (const img of options.originalImages!) {
      let imgB64: string;
      let imgMime: string;

      if (img.b64Json) {
        imgB64 = img.b64Json;
        imgMime = img.mimeType ?? "image/jpeg";
      } else if (img.url) {
        const fetched = await fetchImageAsBase64(img.url);
        imgB64 = fetched.b64;
        imgMime = fetched.mimeType;
      } else {
        continue;
      }

      const ext = imgMime.includes("png") ? "png" : "jpg";
      const blob = new Blob([Buffer.from(imgB64, "base64")], { type: imgMime });
      form.append("image[]", blob, `image.${ext}`);
    }

    const response = await fetch(`${baseUrl}/images/edits`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: form as unknown as BodyInit,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Image edit failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const result = (await response.json()) as { data: Array<{ b64_json?: string; url?: string }> };
    const item = result.data?.[0];

    if (item?.b64_json) {
      b64Json = item.b64_json;
    } else if (item?.url) {
      const fetched = await fetchImageAsBase64(item.url);
      b64Json = fetched.b64;
      mimeType = fetched.mimeType;
    } else {
      throw new Error("No image returned from OpenAI edits API");
    }
  } else {
    // Geração simples com DALL-E 3
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: options.prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Image generation failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const result = (await response.json()) as { data: Array<{ b64_json?: string; url?: string }> };
    const item = result.data?.[0];

    if (item?.b64_json) {
      b64Json = item.b64_json;
    } else if (item?.url) {
      const fetched = await fetchImageAsBase64(item.url);
      b64Json = fetched.b64;
      mimeType = fetched.mimeType;
    } else {
      throw new Error("No image returned from OpenAI generations API");
    }
  }

  const buffer = Buffer.from(b64Json, "base64");
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, mimeType);
  return { url };
}

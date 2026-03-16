/**
 * Storage helpers — usa AWS S3 (variáveis AWS_*) ou Supabase Storage (SUPABASE_*)
 *
 * Variáveis de ambiente:
 *   AWS S3 (preferido):
 *     AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
 *   Supabase Storage (alternativo):
 *     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET (default: "homenz")
 */

import { ENV } from "./_core/env";

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

// ── AWS S3 ────────────────────────────────────────────────────────────────────

async function s3Put(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const bucket = process.env.AWS_S3_BUCKET!;
  const region = process.env.AWS_REGION ?? "us-east-1";

  const client = new S3Client({ region });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: typeof data === "string" ? Buffer.from(data) : data,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { key, url };
}

async function s3GetUrl(key: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET!;
  const region = process.env.AWS_REGION ?? "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// ── Supabase Storage ──────────────────────────────────────────────────────────

async function supabasePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = ENV.supabaseUrl || process.env.SUPABASE_URL!;
  const serviceKey = ENV.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "homenz";

  const supabase = createClient(supabaseUrl, serviceKey);
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(key, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);
  return { key, url: urlData.publicUrl };
}

async function supabaseGetUrl(key: string): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = ENV.supabaseUrl || process.env.SUPABASE_URL!;
  const serviceKey = ENV.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "homenz";

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

// ── Detecção automática de provider ──────────────────────────────────────────

function detectProvider(): "s3" | "supabase" | "none" {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET) return "s3";
  if (ENV.supabaseUrl && ENV.supabaseServiceKey) return "supabase";
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return "supabase";
  return "none";
}

// ── API pública ───────────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const provider = detectProvider();

  if (provider === "s3") return s3Put(key, data, contentType);
  if (provider === "supabase") return supabasePut(key, data, contentType);

  // Fallback: retorna data URL (apenas para desenvolvimento local sem storage configurado)
  console.warn("[storage] Nenhum provider de storage configurado. Usando data URL temporária.");
  const b64 = Buffer.isBuffer(data) ? data.toString("base64") : Buffer.from(data as any).toString("base64");
  return { key, url: `data:${contentType};base64,${b64}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const provider = detectProvider();

  if (provider === "s3") return { key, url: await s3GetUrl(key) };
  if (provider === "supabase") return { key, url: await supabaseGetUrl(key) };

  throw new Error("Nenhum provider de storage configurado.");
}

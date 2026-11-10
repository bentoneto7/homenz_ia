// Armazenamento de arquivos: fotos enviadas pelos leads e imagens geradas pela IA.
//
// Com S3_BUCKET definido, os arquivos vão para um bucket S3 (Railway). O bucket é
// privado: a URL devolvida é um endereço estável deste app (/api/files/<chave>), que
// redireciona para um link assinado e temporário. Sem S3_BUCKET, usa o proxy de
// storage da Manus (legado).

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from './_core/env';

export const FILES_ROUTE = "/api/files";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

type S3Target = { client: S3Client; bucket: string };
let s3Target: S3Target | null | undefined;

function getS3(): S3Target | null {
  if (s3Target !== undefined) return s3Target;

  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    s3Target = null;
    return s3Target;
  }

  s3Target = {
    bucket,
    client: new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: { accessKeyId, secretAccessKey },
      // Só envia checksum quando a operação exige: nem todo serviço compatível com S3
      // aceita os checksums que o SDK passou a mandar por padrão.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
  return s3Target;
}

function publicBaseUrl(): string {
  const explicit = process.env.PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  return railwayDomain ? `https://${railwayDomain}` : "";
}

function fileUrl(key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${publicBaseUrl()}${FILES_ROUTE}/${path}`;
}

/** Link assinado e temporário para baixar um arquivo do bucket. */
export async function storageSignedUrl(relKey: string): Promise<string> {
  const s3 = getS3();
  if (!s3) throw new Error("Bucket S3 não configurado");
  return getSignedUrl(
    s3.client,
    new GetObjectCommand({ Bucket: s3.bucket, Key: normalizeKey(relKey) }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  );
}

/**
 * Serviços externos (fal, LLM) baixam a foto pela URL. Para os endereços deste app,
 * entrega o link assinado direto, sem depender de o serviço seguir o redirecionamento.
 */
export async function toFetchableUrl(url: string): Promise<string> {
  const marker = `${FILES_ROUTE}/`;
  const at = url.indexOf(marker);
  if (at === -1 || !getS3()) return url;
  const key = decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
  return storageSignedUrl(key);
}

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  const s3 = getS3();
  if (s3) {
    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: typeof data === "string" ? Buffer.from(data) : data,
        ContentType: contentType,
      })
    );
    return { key, url: fileUrl(key) };
  }

  const { baseUrl, apiKey } = getStorageConfig();
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const key = normalizeKey(relKey);
  if (getS3()) return { key, url: fileUrl(key) };

  const { baseUrl, apiKey } = getStorageConfig();
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

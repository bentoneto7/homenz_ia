/**
 * Script para reprocessar todas as imagens DEPOIS existentes no banco
 * usando o novo algoritmo Python que preserva 100% a identidade da pessoa
 */
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { readFileSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { createConnection } from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL || !FORGE_API_URL || !FORGE_API_KEY) {
  console.error("Variáveis de ambiente necessárias não encontradas");
  console.error("DATABASE_URL:", !!DATABASE_URL);
  console.error("BUILT_IN_FORGE_API_URL:", !!FORGE_API_URL);
  console.error("BUILT_IN_FORGE_API_KEY:", !!FORGE_API_KEY);
  process.exit(1);
}

// Upload usando o mesmo padrão do storage.ts
async function storagePut(relKey, buffer, contentType = "image/png") {
  const baseUrl = FORGE_API_URL.replace(/\/+$/, "");
  const key = relKey.replace(/^\/+/, "");
  const uploadUrl = new URL("v1/storage/upload", baseUrl + "/");
  uploadUrl.searchParams.set("path", key);
  
  const blob = new Blob([buffer], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, key.split("/").pop() ?? key);
  
  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
    body: formData,
  });
  
  if (!response.ok) {
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed (${response.status}): ${msg}`);
  }
  
  const data = await response.json();
  return data.url;
}

const conn = await createConnection(DATABASE_URL);

// Buscar todos os resultados com beforeImageUrl
const [rows] = await conn.execute(
  `SELECT id, beforeImageUrl, afterImageUrl 
   FROM ai_results 
   WHERE processingStatus = 'done' 
   AND beforeImageUrl IS NOT NULL 
   AND beforeImageUrl != ''
   ORDER BY id DESC`
);

console.log(`Encontrados ${rows.length} resultados para reprocessar`);

const scriptPath = join(__dirname, "server", "hair_processor.py");

let success = 0, failed = 0;

for (const row of rows) {
  const { id, beforeImageUrl } = row;
  console.log(`\nProcessando resultado #${id}`);
  
  const tmpOutput = join(tmpdir(), `hair_reprocess_${id}_${Date.now()}.png`);
  
  try {
    // Processar com Python
    const { stderr } = await execFileAsync(
      "python3",
      [scriptPath, beforeImageUrl, tmpOutput],
      { timeout: 60_000 }
    );
    if (stderr) console.warn(`  [warn] ${stderr.substring(0, 100)}`);
    
    // Ler resultado
    const processedBuffer = readFileSync(tmpOutput);
    
    // Upload para S3 via Manus Storage API
    const s3Key = `ai-results/${id}-after-reprocessed-${Date.now()}.png`;
    const newAfterUrl = await storagePut(s3Key, processedBuffer);
    
    // Atualizar banco
    await conn.execute(
      "UPDATE ai_results SET afterImageUrl = ? WHERE id = ?",
      [newAfterUrl, id]
    );
    
    console.log(`  ✅ Sucesso: ${newAfterUrl}`);
    success++;
    
    // Limpar tmp
    try { unlinkSync(tmpOutput); } catch {}
    
  } catch (err) {
    console.error(`  ❌ Falhou #${id}: ${err.message}`);
    failed++;
    try { unlinkSync(tmpOutput); } catch {}
  }
  
  // Pequena pausa
  await new Promise(r => setTimeout(r, 300));
}

await conn.end();
console.log(`\n✅ Concluído: ${success} sucesso, ${failed} falhas de ${rows.length} total`);

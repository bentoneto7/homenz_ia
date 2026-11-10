import { Router } from "express";
import { FILES_ROUTE, storageSignedUrl } from "./storage";

const router = Router();

/**
 * GET /api/files/<chave>
 * Endereço estável de cada arquivo do bucket, que é privado. Só redireciona para um
 * link assinado e temporário: quem entrega o arquivo é o bucket, não este app.
 */
router.use(FILES_ROUTE, async (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  let key: string;
  try {
    key = decodeURIComponent(req.path.replace(/^\/+/, ""));
  } catch {
    return res.status(400).json({ error: "Arquivo inválido" });
  }
  if (!key || key.split("/").includes("..")) {
    return res.status(400).json({ error: "Arquivo inválido" });
  }

  try {
    const signedUrl = await storageSignedUrl(key);
    // Menor que a validade do link assinado, para o navegador nunca reusar um link vencido.
    res.setHeader("Cache-Control", "private, max-age=1800");
    return res.redirect(302, signedUrl);
  } catch (err) {
    console.error("[files] Erro ao gerar link do arquivo:", err);
    return res.status(404).json({ error: "Arquivo não encontrado" });
  }
});

export { router as filesRouter };

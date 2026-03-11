import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const router = Router();

// Multer com armazenamento em memória (sem disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas"));
    }
  },
});

/**
 * POST /api/upload-lead-photo
 * Recebe multipart/form-data com campo "file" e faz upload para S3.
 * Retorna { url: string }
 */
router.post(
  "/api/upload-lead-photo",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const ext = req.file.mimetype === "image/png" ? "png" : "jpg";
      const fileKey = `leads/photos/chat-${nanoid(12)}.${ext}`;

      const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);

      return res.json({ url, key: fileKey });
    } catch (err) {
      console.error("[upload-lead-photo] Erro:", err);
      return res.status(500).json({ error: "Falha no upload da foto" });
    }
  }
);

export { router as uploadRouter };

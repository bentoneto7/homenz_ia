-- Adicionar pixel_id na tabela franchises (pixel único por franquia)
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS pixel_id TEXT DEFAULT NULL;

-- Adicionar pixel_id também na tabela franchise_landing_pages (pixel específico por landing page, sobrescreve o da franquia)
ALTER TABLE franchise_landing_pages ADD COLUMN IF NOT EXISTS pixel_id TEXT DEFAULT NULL;

-- Comentário: pixel_id é o ID do Meta Pixel (ex: 1234567890123)
-- Prioridade: landing page pixel_id > franchise pixel_id > sem pixel

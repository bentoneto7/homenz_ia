-- Atualizar check constraint do campo plan em franchises para incluir novos valores
ALTER TABLE public.franchises DROP CONSTRAINT IF EXISTS franchises_plan_check;
ALTER TABLE public.franchises ADD CONSTRAINT franchises_plan_check 
  CHECK (plan IN ('free', 'starter', 'pro', 'enterprise', 'network'));

-- Atualizar plano padrão para 'free'
ALTER TABLE public.franchises ALTER COLUMN plan SET DEFAULT 'free';

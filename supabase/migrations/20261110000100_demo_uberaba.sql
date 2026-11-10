-- Ambiente de demonstração: a página que o botão "Ver demo ao vivo" da landing abre
-- e as senhas dos atalhos da tela de login (client/src/pages/HomenzLogin.tsx).
-- A senha do dono da rede (admin@homenzbrasil.com.br) não fica aqui: é definida à parte.
-- Idempotente.

INSERT INTO public.franchise_landing_pages
  (franchise_id, slug, title, procedure, city, state, utm_source, utm_medium, utm_campaign, active)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'uberaba-demo', 'Recupere seu cabelo na Homenz Uberaba',
   'crescimento-capilar', 'Uberaba', 'MG', 'instagram', 'social', 'demo-uberaba', TRUE)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.profiles
SET password_hash = crypt('franq123', gen_salt('bf', 10))
WHERE email = 'franqueado@homenzuberaba.com.br';

UPDATE public.profiles
SET password_hash = crypt('vendedor123', gen_salt('bf', 10))
WHERE email IN ('carlos@homenzuberaba.com.br', 'ana@homenzuberaba.com.br', 'rafael@homenzuberaba.com.br');

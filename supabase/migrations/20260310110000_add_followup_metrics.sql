-- Adicionar colunas de follow-up e métricas avançadas ao seller_metrics
ALTER TABLE seller_metrics 
  ADD COLUMN IF NOT EXISTS leads_followup_done INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_lost_no_contact INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_lost_no_followup INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followup_rate DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_contact_rate DECIMAL(5,2) DEFAULT 0;

-- Atualizar dados demo com valores de follow-up
UPDATE seller_metrics SET
  leads_followup_done = 14,
  leads_lost_no_contact = 2,
  leads_lost_no_followup = 1,
  followup_rate = 87.5,
  first_contact_rate = 88.9
WHERE seller_id = 'a0000000-0000-0000-0000-000000000003';

UPDATE seller_metrics SET
  leads_followup_done = 10,
  leads_lost_no_contact = 2,
  leads_lost_no_followup = 2,
  followup_rate = 83.3,
  first_contact_rate = 85.7
WHERE seller_id = 'a0000000-0000-0000-0000-000000000004';

UPDATE seller_metrics SET
  leads_followup_done = 6,
  leads_lost_no_contact = 3,
  leads_lost_no_followup = 4,
  followup_rate = 66.7,
  first_contact_rate = 75.0
WHERE seller_id = 'a0000000-0000-0000-0000-000000000005';

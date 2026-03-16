-- ─────────────────────────────────────────────────────────────────────────────
-- Homenz.ia — Row Level Security (RLS)
-- Migração: 20240101000001_rls_policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_photos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_results            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_blocked_dates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_health_scores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_metrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_invite_uses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_sellers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits           ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Função auxiliar: verificar se o usuário é owner/admin da rede
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_network_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
      AND active = TRUE
  );
$$;

-- Função auxiliar: retornar clinic_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.my_clinic_id()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT clinic_id FROM public.clinic_users
  WHERE user_id = auth.uid() AND active = TRUE
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_network_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- PLAN LIMITS (leitura pública)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "plan_limits_select_all" ON public.plan_limits
  FOR SELECT USING (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINICS
-- ─────────────────────────────────────────────────────────────────────────────
-- Leitura pública do slug (para landing page)
CREATE POLICY "clinics_select_public" ON public.clinics
  FOR SELECT USING (active = TRUE);

-- Membros da clínica podem ler todos os dados
CREATE POLICY "clinics_select_member" ON public.clinics
  FOR SELECT USING (
    id = public.my_clinic_id()
    OR owner_user_id = auth.uid()
    OR public.is_network_admin()
  );

CREATE POLICY "clinics_insert_authenticated" ON public.clinics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clinics_update_owner" ON public.clinics
  FOR UPDATE USING (
    owner_user_id = auth.uid()
    OR public.is_network_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINIC USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "clinic_users_select" ON public.clinic_users
  FOR SELECT USING (
    clinic_id = public.my_clinic_id()
    OR user_id = auth.uid()
    OR public.is_network_admin()
  );

CREATE POLICY "clinic_users_insert_owner" ON public.clinic_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_id AND owner_user_id = auth.uid()
    )
    OR public.is_network_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────────────────────────────────────
-- Leads públicos: qualquer um pode inserir (funil público)
CREATE POLICY "leads_insert_public" ON public.leads
  FOR INSERT WITH CHECK (TRUE);

-- Leitura: membros da clínica ou admin da rede
CREATE POLICY "leads_select_clinic" ON public.leads
  FOR SELECT USING (
    clinic_id = public.my_clinic_id()
    OR public.is_network_admin()
    -- Vendedor vê apenas seus leads atribuídos
    OR assigned_seller_id = auth.uid()
  );

CREATE POLICY "leads_update_clinic" ON public.leads
  FOR UPDATE USING (
    clinic_id = public.my_clinic_id()
    OR public.is_network_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD PHOTOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "lead_photos_insert_public" ON public.lead_photos
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "lead_photos_select_clinic" ON public.lead_photos
  FOR SELECT USING (
    clinic_id = public.my_clinic_id()
    OR public.is_network_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- AI RESULTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "ai_results_insert_service" ON public.ai_results
  FOR INSERT WITH CHECK (TRUE); -- inserido via Edge Function (service role)

CREATE POLICY "ai_results_select_clinic" ON public.ai_results
  FOR SELECT USING (
    clinic_id = public.my_clinic_id()
    OR public.is_network_admin()
  );

CREATE POLICY "ai_results_update_service" ON public.ai_results
  FOR UPDATE USING (TRUE); -- atualizado via Edge Function

-- ─────────────────────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "appointments_insert_public" ON public.appointments
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "appointments_select_clinic" ON public.appointments
  FOR SELECT USING (
    clinic_id = public.my_clinic_id()
    OR public.is_network_admin()
  );

CREATE POLICY "appointments_update_clinic" ON public.appointments
  FOR UPDATE USING (
    clinic_id = public.my_clinic_id()
    OR public.is_network_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TREATMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "treatments_select_clinic" ON public.treatments
  FOR SELECT USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "treatments_insert_clinic" ON public.treatments
  FOR INSERT WITH CHECK (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "treatments_update_clinic" ON public.treatments
  FOR UPDATE USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "notifications_select_clinic" ON public.notifications
  FOR SELECT USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "notifications_insert_service" ON public.notifications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "notifications_update_clinic" ON public.notifications
  FOR UPDATE USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- NPS RESPONSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "nps_select_clinic" ON public.nps_responses
  FOR SELECT USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "nps_insert_public" ON public.nps_responses
  FOR INSERT WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINIC AVAILABILITY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "availability_select_public" ON public.clinic_availability
  FOR SELECT USING (TRUE);

CREATE POLICY "availability_insert_clinic" ON public.clinic_availability
  FOR INSERT WITH CHECK (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "availability_update_clinic" ON public.clinic_availability
  FOR UPDATE USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "blocked_dates_select_public" ON public.clinic_blocked_dates
  FOR SELECT USING (TRUE);

CREATE POLICY "blocked_dates_insert_clinic" ON public.clinic_blocked_dates
  FOR INSERT WITH CHECK (clinic_id = public.my_clinic_id() OR public.is_network_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD EVENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "lead_events_insert_public" ON public.lead_events
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "lead_events_select_clinic" ON public.lead_events
  FOR SELECT USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD FOLLOWUPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "followups_select_clinic" ON public.lead_followups
  FOR SELECT USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "followups_insert_service" ON public.lead_followups
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "followups_update_clinic" ON public.lead_followups
  FOR UPDATE USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- BRANDS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "brands_select_all" ON public.brands
  FOR SELECT USING (active = TRUE);

CREATE POLICY "brands_insert_owner" ON public.brands
  FOR INSERT WITH CHECK (public.is_network_admin());

CREATE POLICY "brands_update_owner" ON public.brands
  FOR UPDATE USING (owner_user_id = auth.uid() OR public.is_network_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINIC HEALTH SCORES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "health_scores_select_clinic" ON public.clinic_health_scores
  FOR SELECT USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "health_scores_insert_service" ON public.clinic_health_scores
  FOR INSERT WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINIC DAILY CHECKINS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "checkins_select_clinic" ON public.clinic_daily_checkins
  FOR SELECT USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "checkins_insert_clinic" ON public.clinic_daily_checkins
  FOR INSERT WITH CHECK (clinic_id = public.my_clinic_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- SELLER INVITES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "seller_invites_select_clinic" ON public.seller_invites
  FOR SELECT USING (clinic_id = public.my_clinic_id() OR public.is_network_admin());

CREATE POLICY "seller_invites_insert_clinic" ON public.seller_invites
  FOR INSERT WITH CHECK (clinic_id = public.my_clinic_id() OR public.is_network_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- SELLER METRICS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "seller_metrics_select_clinic" ON public.seller_metrics
  FOR SELECT USING (
    clinic_id = public.my_clinic_id()
    OR seller_user_id = auth.uid()
    OR public.is_network_admin()
  );

CREATE POLICY "seller_metrics_insert_service" ON public.seller_metrics
  FOR INSERT WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD ASSIGNMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "lead_assignments_select" ON public.lead_assignments
  FOR SELECT USING (
    clinic_id = public.my_clinic_id()
    OR seller_user_id = auth.uid()
    OR public.is_network_admin()
  );

CREATE POLICY "lead_assignments_insert_service" ON public.lead_assignments
  FOR INSERT WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- ACCESS INVITES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "access_invites_select_owner" ON public.access_invites
  FOR SELECT USING (created_by_user_id = auth.uid() OR public.is_network_admin());

CREATE POLICY "access_invites_insert_owner" ON public.access_invites
  FOR INSERT WITH CHECK (public.is_network_admin());

CREATE POLICY "access_invite_uses_insert_public" ON public.access_invite_uses
  FOR INSERT WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- LANDING PAGE SELLERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "lp_sellers_select_public" ON public.landing_page_sellers
  FOR SELECT USING (TRUE);

CREATE POLICY "lp_sellers_insert_owner" ON public.landing_page_sellers
  FOR INSERT WITH CHECK (public.is_network_admin());

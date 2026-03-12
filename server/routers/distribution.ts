/**
 * Router tRPC — Distribuição de Leads + Landing Pages
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { createClient } from '@supabase/supabase-js';
import {
  createAndDistributeLead,
  distributeLeadRoundRobin,
  getFranchiseDistributionStats,
} from '../leadDistribution';
import { trackPixelEvent, getPixelEventStats } from '../pixelEvents';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const distributionRouter = router({
  /**
   * Busca dados de uma landing page pelo slug (público)
   */
  getLandingPage: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('franchise_landing_pages')
        .select(`
          id, slug, title, procedure, city, state, active,
          total_views, total_leads, utm_source, utm_medium, utm_campaign,
          franchise_id, pixel_id,
          franchises!inner(id, name, slug, city, state, phone, address, logo_url, pixel_id)
        `)
        .eq('slug', input.slug)
        .eq('active', true)
        .single();

      if (error || !data) {
        throw new Error('Landing page não encontrada');
      }

      // Incrementar views
      await supabase
        .from('franchise_landing_pages')
        .update({ total_views: (data.total_views || 0) + 1 })
        .eq('id', data.id);

      return data;
    }),

  /**
   * Submete lead via landing page (público)
   * Cria o lead e distribui automaticamente via round-robin
   */
  submitLead: publicProcedure
    .input(z.object({
      landingPageSlug: z.string(),
      name: z.string().min(2, 'Nome muito curto'),
      phone: z.string().min(10, 'Telefone inválido'),
      email: z.string().email().optional(),
      age: z.number().min(18).max(90).optional(),
      hairProblem: z.string().optional(),
      photoUrl: z.string().url().optional(),
      chatSummary: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // 1. Buscar landing page
      const { data: lp, error: lpError } = await supabase
        .from('franchise_landing_pages')
        .select('id, franchise_id, city, state, utm_source, utm_medium, utm_campaign')
        .eq('slug', input.landingPageSlug)
        .eq('active', true)
        .single();

      if (lpError || !lp) {
        throw new Error('Landing page inativa ou não encontrada');
      }

      // 2. Criar e distribuir lead
      const result = await createAndDistributeLead({
        franchiseId: lp.franchise_id,
        landingPageId: lp.id,
        name: input.name,
        phone: input.phone,
        email: input.email,
        age: input.age,
        hairProblem: input.hairProblem,
        photoUrl: input.photoUrl,
        chatSummary: input.chatSummary,
        city: lp.city,
        state: lp.state,
        utmSource: input.utmSource || lp.utm_source || 'direct',
        utmMedium: input.utmMedium || lp.utm_medium || 'organic',
        utmCampaign: input.utmCampaign || lp.utm_campaign || input.landingPageSlug,
      });

      // 3. Enviar evento via CAPI (server-side) se configurado
      try {
        // Buscar pixel_id e capi_access_token da franquia
        const { data: franchise } = await supabase
          .from('franchises')
          .select('*')
          .eq('id', lp.franchise_id)
          .single();
        const franchiseData = franchise as Record<string, unknown> | null;
        let pixelId = franchiseData?.pixel_id as string | null | undefined;
        let capiToken = franchiseData?.capi_access_token as string | null | undefined;
        // Fallback: ler de landing pages especiais
        if (!pixelId) {
          const configSlug = `__pixel_${lp.franchise_id.replace(/-/g, '')}__`;
          const { data: pixelLp } = await supabase
            .from('franchise_landing_pages')
            .select('utm_campaign')
            .eq('slug', configSlug)
            .single();
          const stored = (pixelLp as { utm_campaign?: string } | null)?.utm_campaign || null;
          if (stored && stored.startsWith('pixel:')) pixelId = stored.slice(6);
        }
        if (!capiToken) {
          const capiSlug = `__capi_${lp.franchise_id.replace(/-/g, '')}__`;
          const { data: capiLp } = await supabase
            .from('franchise_landing_pages')
            .select('utm_campaign')
            .eq('slug', capiSlug)
            .single();
          const stored = (capiLp as { utm_campaign?: string } | null)?.utm_campaign || null;
          if (stored && stored.startsWith('capi:')) capiToken = stored.slice(5);
        }
        if (pixelId && capiToken) {
          const { sendCapiEvent, hashPhone } = await import('../metaCapi');
          const phoneHash = await hashPhone(input.phone);
          // Evento Lead
          await sendCapiEvent({
            pixelId,
            accessToken: capiToken,
            eventName: 'Lead',
            externalId: result.leadId,
            phoneHash,
            customData: {
              content_name: 'Diagnóstico Capilar Gratuito',
              content_category: 'Hair Clinic',
              currency: 'BRL',
              value: 0,
            },
          });
          // Evento CompleteRegistration
          await sendCapiEvent({
            pixelId,
            accessToken: capiToken,
            eventName: 'CompleteRegistration',
            externalId: result.leadId,
            phoneHash,
            customData: {
              content_name: 'Diagnóstico Capilar Gratuito',
              status: 'distributed',
              currency: 'BRL',
              value: 0,
            },
          });
        }
      } catch (capiErr) {
        // CAPI não bloqueia o fluxo principal
        console.error('[CAPI] Erro ao enviar eventos:', capiErr);
      }

      return {
        success: true,
        leadId: result.leadId,
        assignedTo: result.distribution.sellerName,
        message: 'Seu contato foi registrado! Em breve nossa equipe entrará em contato.',
      };
    }),

  /**
   * Busca estatísticas de distribuição de uma franquia (protegido — franqueado/admin)
   */
  getDistributionStats: protectedProcedure
    .input(z.object({ franchiseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Verificar acesso: admin ou franqueado da própria franquia
      const userRole = (ctx.user as unknown as { role: string; franchise_id?: string }).role;
      const userFranchiseId = (ctx.user as unknown as { franchise_id?: string }).franchise_id;
      if (
        userRole !== 'admin' &&
        userRole !== 'network_owner' &&
        userFranchiseId !== input.franchiseId
      ) {
        throw new Error('Acesso negado');
      }

      return getFranchiseDistributionStats(input.franchiseId);
    }),

  /**
   * Lista todas as landing pages de uma franquia (protegido)
   */
  getFranchiseLandingPages: protectedProcedure
    .input(z.object({ franchiseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userRole2 = (ctx.user as unknown as { role: string; franchise_id?: string }).role;
      const userFranchiseId2 = (ctx.user as unknown as { franchise_id?: string }).franchise_id;
      if (
        userRole2 !== 'admin' &&
        userRole2 !== 'network_owner' &&
        userFranchiseId2 !== input.franchiseId
      ) {
        throw new Error('Acesso negado');
      }

      const { data, error } = await supabase
        .from('franchise_landing_pages')
        .select('*')
        .eq('franchise_id', input.franchiseId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }),

  /**
   * Cria uma nova landing page para a franquia (protegido — franqueado)
   */
  createLandingPage: protectedProcedure
    .input(z.object({
      franchiseId: z.string().uuid(),
      title: z.string().min(5),
      procedure: z.string().default('crescimento-capilar'),
      utmSource: z.string().default('meta'),
      utmMedium: z.string().default('cpc'),
    }))
    .mutation(async ({ input, ctx }) => {
      const userRole3 = (ctx.user as unknown as { role: string; franchise_id?: string }).role;
      const userFranchiseId3 = (ctx.user as unknown as { franchise_id?: string }).franchise_id;
      if (
        userRole3 !== 'admin' &&
        userRole3 !== 'network_owner' &&
        userFranchiseId3 !== input.franchiseId
      ) {
        throw new Error('Acesso negado');
      }

      // Buscar dados da franquia
      const { data: franchise } = await supabase
        .from('franchises')
        .select('slug, city, state')
        .eq('id', input.franchiseId)
        .single();

      if (!franchise) throw new Error('Franquia não encontrada');

      // Gerar slug único
      const baseSlug = franchise.slug + '-' + input.procedure;
      const timestamp = Date.now().toString(36);
      const slug = `${baseSlug}-${timestamp}`;

      const { data, error } = await supabase
        .from('franchise_landing_pages')
        .insert({
          franchise_id: input.franchiseId,
          slug,
          title: input.title,
          procedure: input.procedure,
          city: franchise.city,
          state: franchise.state,
          utm_source: input.utmSource,
          utm_medium: input.utmMedium,
          utm_campaign: slug,
          active: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  /**
   * Ativa/desativa uma landing page (protegido)
   */
  toggleLandingPage: protectedProcedure
    .input(z.object({
      landingPageId: z.string().uuid(),
      active: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const { error } = await supabase
        .from('franchise_landing_pages')
        .update({ active: input.active, updated_at: new Date().toISOString() })
        .eq('id', input.landingPageId);

      if (error) throw new Error(error.message);
      return { success: true };
    }),

  /**
   * Redistribui manualmente um lead para outro vendedor (protegido — franqueado)
   */
  reassignLead: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      newSellerId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userRole4 = (ctx.user as unknown as { role: string }).role;
      if (userRole4 !== 'admin' && userRole4 !== 'network_owner' && userRole4 !== 'franchisee') {
        throw new Error('Acesso negado');
      }

      // Buscar o lead
      const { data: lead } = await supabase
        .from('leads')
        .select('id, franchise_id, assigned_to')
        .eq('id', input.leadId)
        .single();

      if (!lead) throw new Error('Lead não encontrado');

      // Buscar nome do novo vendedor
      const { data: seller } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', input.newSellerId)
        .single();

      // Atualizar lead
      await supabase
        .from('leads')
        .update({
          assigned_to: input.newSellerId,
          distribution_status: 'reassigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.leadId);

      // Registrar no log
      await supabase
        .from('lead_distribution_log')
        .insert({
          lead_id: input.leadId,
          franchise_id: lead.franchise_id,
          seller_id: input.newSellerId,
          method: 'manual',
          notes: input.reason || `Reatribuído manualmente para ${seller?.name}`,
        });

      return { success: true, sellerName: seller?.name };
    }),

  /**
   * Busca o histórico de distribuição de um lead específico
   */
  getLeadDistributionHistory: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('lead_distribution_log')
        .select(`
          id, method, seller_position, notes, created_at,
          profiles!seller_id(name, email)
        `)
        .eq('lead_id', input.leadId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }),

  /**
   * Atualiza o pixel_id da franquia (protegido — franqueado)
   */
  updateFranchisePixel: protectedProcedure
    .input(z.object({
      franchiseId: z.string().uuid(),
      pixelId: z.string().max(30).optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userRole5 = (ctx.user as unknown as { role: string; franchise_id?: string }).role;
      const userFranchiseId5 = (ctx.user as unknown as { franchise_id?: string }).franchise_id;
      if (
        userRole5 !== 'admin' &&
        userRole5 !== 'network_owner' &&
        userFranchiseId5 !== input.franchiseId
      ) {
        throw new Error('Acesso negado');
      }
      const { error } = await supabase
        .from('franchises')
        .update({ pixel_id: input.pixelId || null, updated_at: new Date().toISOString() })
        .eq('id', input.franchiseId);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  /**
   * Busca o pixel_id da franquia (protegido)
   */
  getFranchisePixel: protectedProcedure
    .input(z.object({ franchiseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userRole6 = (ctx.user as unknown as { role: string; franchise_id?: string }).role;
      const userFranchiseId6 = (ctx.user as unknown as { franchise_id?: string }).franchise_id;
      if (
        userRole6 !== 'admin' &&
        userRole6 !== 'network_owner' &&
        userFranchiseId6 !== input.franchiseId
      ) {
        throw new Error('Acesso negado');
      }
      const { data, error } = await supabase
        .from('franchises')
        .select('pixel_id')
        .eq('id', input.franchiseId)
        .single();
      if (error) throw new Error(error.message);
      return { pixelId: (data as { pixel_id?: string | null })?.pixel_id || null };
    }),

  /**
   * Atualiza o pixel_id de uma landing page específica.
   * Permite que cada LP tenha seu próprio pixel (sobrescreve o da franquia).
   * Usa o campo utm_campaign com prefixo 'lppixel:' como fallback se a coluna pixel_id não existir.
   */
  updateLandingPagePixel: protectedProcedure
    .input(z.object({
      landingPageId: z.string().uuid(),
      pixelId: z.string().max(30).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userRole7 = (ctx.user as unknown as { role: string; franchise_id?: string }).role;
      // Verificar ownership da landing page
      const { data: lp } = await supabase
        .from('franchise_landing_pages')
        .select('franchise_id')
        .eq('id', input.landingPageId)
        .single();
      if (!lp) throw new Error('Landing page não encontrada');
      const userFranchiseId7 = (ctx.user as unknown as { franchise_id?: string }).franchise_id;
      if (userRole7 !== 'admin' && userRole7 !== 'network_owner' && userFranchiseId7 !== (lp as { franchise_id: string }).franchise_id) {
        throw new Error('Acesso negado');
      }
      // Tentar atualizar pixel_id diretamente
      const { error: directErr } = await supabase
        .from('franchise_landing_pages')
        .update({ pixel_id: input.pixelId || null } as Record<string, unknown>)
        .eq('id', input.landingPageId);
      if (!directErr) return { success: true, method: 'direct' };
      // Fallback: usar utm_campaign com prefixo especial
      const utmValue = input.pixelId ? `lppixel:${input.pixelId}` : null;
      const { error: fallbackErr } = await supabase
        .from('franchise_landing_pages')
        .update({ utm_campaign: utmValue })
        .eq('id', input.landingPageId);
      if (fallbackErr) throw new Error(fallbackErr.message);
      return { success: true, method: 'fallback' };
    }),

  /**
   * Registra evento de pixel (público — chamado pela landing page)
   */
  trackPixelEvent: publicProcedure
    .input(z.object({
      slug: z.string(),
      event: z.enum(['ViewContent', 'InitiateCheckout', 'Lead', 'CompleteRegistration']),
    }))
    .mutation(async ({ input }) => {
      trackPixelEvent(input.slug, input.event);
      return { success: true };
    }),

  /**
   * Retorna estatísticas de eventos de pixel por landing page (protegido)
   */
  getPixelEventStats: protectedProcedure
    .input(z.object({ franchiseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userRole9 = (ctx.user as unknown as { role: string; franchise_id?: string }).role;
      const userFranchiseId9 = (ctx.user as unknown as { franchise_id?: string }).franchise_id;
      if (userRole9 !== 'admin' && userRole9 !== 'network_owner' && userFranchiseId9 !== input.franchiseId) {
        throw new Error('Acesso negado');
      }
      // Buscar slugs das landing pages da franquia
      const { data: lps } = await supabase
        .from('franchise_landing_pages')
        .select('id, slug, title')
        .eq('franchise_id', input.franchiseId)
        .eq('active', true);
      if (!lps || lps.length === 0) return {};
      const slugs = (lps as { slug: string }[]).map(lp => lp.slug);
      const stats = await getPixelEventStats(slugs);
      // Adicionar título da LP
      const result: Record<string, unknown> = {};
      for (const lp of lps as { id: string; slug: string; title: string }[]) {
        result[lp.slug] = {
          ...(stats[lp.slug] || {}),
          title: lp.title,
          lpId: lp.id,
        };
      }
      return result;
    }),

  /**
   * Busca o pixel_id de uma landing page específica.
   */
  getLandingPagePixel: protectedProcedure
    .input(z.object({ landingPageId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userRole8 = (ctx.user as unknown as { role: string; franchise_id?: string }).role;
      const { data: lp } = await supabase
        .from('franchise_landing_pages')
        .select('*')
        .eq('id', input.landingPageId)
        .single();
      if (!lp) throw new Error('Landing page não encontrada');
      const userFranchiseId8 = (ctx.user as unknown as { franchise_id?: string }).franchise_id;
      if (userRole8 !== 'admin' && userRole8 !== 'network_owner' && userFranchiseId8 !== (lp as { franchise_id: string }).franchise_id) {
        throw new Error('Acesso negado');
      }
      const lpData = lp as Record<string, unknown>;
      // Tentar pixel_id direto
      if (lpData.pixel_id !== undefined) {
        return { pixelId: (lpData.pixel_id as string | null) || null };
      }
      // Fallback: ler do utm_campaign com prefixo lppixel:
      const utm = lpData.utm_campaign as string | null;
      return { pixelId: utm && utm.startsWith('lppixel:') ? utm.slice(8) : null };
    }),
});

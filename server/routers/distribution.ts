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
          franchise_id,
          franchises!inner(id, name, slug, city, state, phone)
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
});

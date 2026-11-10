import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { nanoid } from "nanoid";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  getDb,
  upsertUser,
  getUserByOpenId,
  getClinicBySlug,
  getClinicForUser,
  getLeadByToken,
  updateLeadFunnelStep,
  getPlanLimits,
  loginClinic,
  registerClinicUser,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "../db";
import {
  clinics,
  clinicUsers,
  leads,
  leadPhotos,
  aiResults,
  appointments,
  notifications,
  npsResponses,
  planLimits,
  treatments,
  users,
  accessInvites,
  accessInviteUses,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut, toFetchableUrl } from "../storage";
import { notifyOwner } from "../_core/notification";
import {
  clinicProcedure,
  adminProcedure,
  requireLeadByToken,
  insertNotification,
  insertLeadEvent,
  seedPlanLimits,
} from "./_shared";

export const aiRouter = router({
  processPhotos: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lead = await requireLeadByToken(input.sessionToken);

      // Verificar limite do plano
      const clinic = await db
        .select()
        .from(clinics)
        .where(eq(clinics.id, lead.clinicId))
        .limit(1);
      if (!clinic[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const limits = await getPlanLimits(clinic[0].plan);
      if (
        limits &&
        limits.aiAnalysesPerMonth !== -1 &&
        clinic[0].currentMonthAiAnalyses >= limits.aiAnalysesPerMonth
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Limite de análises do plano atingido",
        });
      }

      // Verificar resultado existente
      const existing = await db
        .select()
        .from(aiResults)
        .where(eq(aiResults.leadId, lead.id))
        .limit(1);

      if (existing[0]?.processingStatus === "done") {
        return { resultId: existing[0].id, status: "done" };
      }

      let resultId: number;
      if (existing[0]) {
        resultId = existing[0].id;
        await db
          .update(aiResults)
          .set({ processingStatus: "processing" })
          .where(eq(aiResults.id, resultId));
      } else {
        const ins = await db.insert(aiResults).values({
          leadId: lead.id,
          clinicId: lead.clinicId,
          processingStatus: "processing",
        });
        resultId = Number((ins as any)[0]?.insertId ?? (ins as any).insertId);
      }

      await updateLeadFunnelStep(lead.id, "ai_processing");

      const photos = await db
        .select()
        .from(leadPhotos)
        .where(eq(leadPhotos.leadId, lead.id));

      if (photos.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nenhuma foto encontrada",
        });
      }

      try {
        // Análise com LLM
        // As fotos ficam num bucket privado: o LLM recebe links assinados.
        const photoMessages = await Promise.all(
          photos.map(async p => ({
            type: "image_url" as const,
            image_url: { url: await toFetchableUrl(p.s3Url), detail: "high" as const },
          }))
        );

        const analysisResp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um especialista em análise capilar da clínica Homenz Advanced. O público atendido é EXCLUSIVAMENTE masculino. Analise as fotos enviadas e retorne um relatório estruturado em JSON.

REGRAS OBRIGATÓRIAS:
- Seja objetivo, empático e direto
- NUNCA faça diagnóstico médico ou prometa resultado clínico garantido
- NUNCA mencione transplante como opção da clínica — a Homenz NÃO realiza transplante
- Tom: especialista confiante, nunca vendedor
- Qualquer grau de calvície encaminha ao time de vendas — sem exceção
- Se densidade = 0% em alguma região, sinalizar como calvície total nessa área

ESCALA DE NORWOOD-HAMILTON (referência obrigatória):
- Norwood I: sem recessão, linha frontal intacta, cabelo saudável. Densidade 100%. Protocolo: Prevenção/Fidelização. Score base: 20-30.
- Norwood II: leve recessão temporal, quase imperceptível. Densidade 85-95%. Protocolo: preventivo + fibras. Score base: 30-45.
- Norwood III: recessão temporal moderada, primeiros sinais visíveis. Densidade 70-85%. Protocolo: fibras capilares + micropigmentação. Score base: 50-65.
- Norwood IV: recessão severa + início de calvície no vertex. Densidade 50-70%. Protocolo: micropigmentação + fibras (combinado). Score base: 65-80.
- Norwood V: área frontal e vertex separadas por faixa estreita. Densidade 30-50%. Protocolo: intensivo combinado. Score base: 75-85.
- Norwood VI: faixa de separação desapareceu, calvície extensa. Densidade 15-30%. Protocolo: micropigmentação prioritária — fios limitados. Score base: 70-80.
- Norwood VII: apenas coroa lateral e nuca preservadas. Densidade <15%. Protocolo: análise individual pelo especialista. Score base: 60-75.

SISTEMA DE LEAD SCORE (0-100):
- Urgência da calvície (40 pts): Norwood III-IV = 25-30 pts | V-VI = 35-40 pts | I-II = 5-15 pts
- Expectativa realista (30 pts): quer resultado claro e rápido = 25-30 pts | indefinido = 10-15 pts
- Histórico de tratamentos (30 pts): sem tratamento prévio = 25-30 pts | tratamentos anteriores = 10-15 pts
- Classificação: ≥70 = QUENTE (follow-up em 2h) | 40-69 = MORNO | <40 = FRIO

Retorne JSON com os campos especificados.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text" as const,
                  text: `Paciente masculino: ${lead.name}, idade: ${lead.age ?? "não informada"}.\n\nDados do chat de qualificação:\n- Problema relatado: ${lead.hairProblem ?? "queda capilar"}\n- Região afetada: ${lead.hairLossType ?? "não informada"}\n- Há quanto tempo: ${lead.hairLossTime ?? "não informado"}\n- Tratamentos anteriores: ${lead.previousTreatments ?? "nenhum"}\n- Expectativas: ${lead.expectations ?? "não informadas"}\n\nAnalise as ${photos.length} fotos enviadas (frente, topo, lado esquerdo, lado direito) e aplique obrigatoriamente a Escala de Norwood-Hamilton. Se alguma região tiver calvície total (densidade 0%), sinalize no campo totalCalvicieAreas. Termine o analysisText SEMPRE com: 'Agende sua avaliação gratuita com um especialista Homenz.'`,
                },
                ...photoMessages,
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "hair_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  baldnessLevel: {
                    type: "string",
                    description: "Nível Norwood I a VII",
                  },
                  baldnessScale: {
                    type: "string",
                    description: "Sempre 'norwood'",
                  },
                  affectedAreas: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Areas afetadas: frontal, temporal, vertex, coronal, diffuse",
                  },
                  totalCalvicieAreas: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Areas com calvície total (densidade 0%) — array vazio se nenhuma",
                  },
                  densityEstimate: {
                    type: "string",
                    description:
                      "Estimativa de densidade por região, ex: '30% da densidade normal no vertex'",
                  },
                  recommendedTreatment: {
                    type: "string",
                    description:
                      "Protocolo recomendado: micropigmentação, fibras ou combinado",
                  },
                  estimatedSessions: {
                    type: "number",
                    description: "Número de sessões estimadas",
                  },
                  analysisText: {
                    type: "string",
                    description:
                      "Laudo completo em português, terminando com 'Agende sua avaliação gratuita com um especialista Homenz.'",
                  },
                  leadScore: {
                    type: "number",
                    description:
                      "Pontuação 0-100 conforme sistema de score do protocolo",
                  },
                  leadScoreBreakdown: {
                    type: "object",
                    properties: {
                      baldnessWeight: {
                        type: "number",
                        description: "Pontuação de urgência da calvície (0-40)",
                      },
                      expectationWeight: {
                        type: "number",
                        description: "Pontuação de expectativa realista (0-30)",
                      },
                      historyWeight: {
                        type: "number",
                        description:
                          "Pontuação de histórico de tratamentos (0-30)",
                      },
                    },
                    required: [
                      "baldnessWeight",
                      "expectationWeight",
                      "historyWeight",
                    ],
                    additionalProperties: false,
                  },
                  priority: {
                    type: "string",
                    description: "low | medium | high | urgent",
                  },
                },
                required: [
                  "baldnessLevel",
                  "baldnessScale",
                  "affectedAreas",
                  "totalCalvicieAreas",
                  "densityEstimate",
                  "recommendedTreatment",
                  "estimatedSessions",
                  "analysisText",
                  "leadScore",
                  "leadScoreBreakdown",
                  "priority",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = analysisResp.choices[0]?.message?.content;
        const analysis = JSON.parse(
          typeof rawContent === "string" ? rawContent : "{}"
        );

        // Gerar imagem simulada pós-preenchimento
        const frontPhoto =
          photos.find(p => p.photoType === "front") ?? photos[0];
        const topPhoto = photos.find(p => p.photoType === "top");
        // Sempre usar a foto de cima (top) como referência — mostra melhor o preenchimento capilar
        // Se não tiver foto de cima, usar a frontal
        // Sempre usar a foto frontal como base para o DEPOIS — garante mesma posição/ângulo
        const bestPhoto = frontPhoto;
        let afterImageUrl = bestPhoto.s3Url;
        try {
          // Gera o DEPOIS (adiciona cabelo PRESERVANDO o rosto). Cascata de motores:
          // 1º fal kontext (melhor/consistente) → 2º Gemini (fallback, tem key) → senão foto original.
          let afterBuffer: Buffer;
          try {
            console.log("[AI] Running fal kontext hair fill...");
            const { falHairFill } = await import("../falHairFill");
            afterBuffer = await falHairFill(await toFetchableUrl(bestPhoto.s3Url));
            console.log("[AI] fal kontext ok");
          } catch (falErr) {
            console.warn("[AI] fal failed, falling back to Gemini:", falErr);
            const { geminiHairFill } = await import("../geminiHairFill");
            afterBuffer = await geminiHairFill(await toFetchableUrl(bestPhoto.s3Url));
            console.log("[AI] Gemini fallback ok");
          }

          const { storagePut: storagePutFn } = await import("../storage");
          const { url: processedUrl } = await storagePutFn(
            `ai-results/${resultId}-after-${Date.now()}.png`,
            afterBuffer,
            "image/png"
          );
          afterImageUrl = processedUrl;
          console.log("[AI] hair fill done:", processedUrl);
        } catch (imgErr) {
          console.warn(
            "[AI] all hair fill engines failed, using original photo:",
            imgErr
          );
          // afterImageUrl já está definido como frontPhoto.s3Url — continua normalmente
        }

        // Salvar resultado — usar SQL raw para evitar bug do Drizzle com TiDB em updates com campos JSON
        // IMPORTANTE: colunas em camelCase conforme schema MySQL
        console.log(
          `[AI] Saving result for lead ${lead.id}, resultId ${resultId}`
        );
        await db.execute(sql`
            UPDATE ai_results SET
              analysisText = ${analysis.analysisText},
              baldnessLevel = ${analysis.baldnessLevel},
              baldnessScale = ${analysis.baldnessScale},
              affectedAreas = ${JSON.stringify(analysis.affectedAreas)},
              densityEstimate = ${analysis.densityEstimate},
              beforeImageUrl = ${frontPhoto.s3Url},
              afterImageUrl = ${afterImageUrl},
              recommendedTreatment = ${analysis.recommendedTreatment},
              estimatedSessions = ${Number(analysis.estimatedSessions)},
              leadScore = ${Number(analysis.leadScore)},
              leadScoreBreakdown = ${JSON.stringify(analysis.leadScoreBreakdown)},
              processingStatus = 'done'
            WHERE id = ${resultId}
          `);
        console.log(
          `[AI] ai_result ${resultId} saved successfully via raw SQL`
        );

        // Atualizar lead com score e prioridade
        await db
          .update(leads)
          .set({
            leadScore: Number(analysis.leadScore),
            leadScoreBreakdown: analysis.leadScoreBreakdown,
            priority: analysis.priority as any,
            funnelStep: "ai_done",
            lastActivityAt: new Date(),
          })
          .where(eq(leads.id, lead.id));

        // Incrementar contador de análises
        await db
          .update(clinics)
          .set({
            currentMonthAiAnalyses: sql`${clinics.currentMonthAiAnalyses} + 1`,
          })
          .where(eq(clinics.id, lead.clinicId));

        // Notificações
        await insertNotification({
          clinicId: lead.clinicId,
          targetType: "clinic",
          leadId: lead.id,
          title: "Análise 3D concluída!",
          content: `${lead.name} — Score: ${analysis.leadScore}/100 | Nível: ${analysis.baldnessLevel} | Prioridade: ${analysis.priority}`,
          type: "ai_ready",
        });

        await notifyOwner({
          title: `Análise pronta — ${lead.name}`,
          content: `Score: ${analysis.leadScore}/100 | ${analysis.baldnessLevel} | ${analysis.priority}`,
        });
        await insertLeadEvent({
          clinicId: lead.clinicId,
          leadId: lead.id,
          eventType: "ai_result_ready",
          description: `Análise 3D concluída — Score ${analysis.leadScore}/100, nível ${analysis.baldnessLevel}`,
          metadata: {
            leadScore: analysis.leadScore,
            priority: analysis.priority,
            baldnessLevel: analysis.baldnessLevel,
          },
          triggeredBy: "system",
        });
        return { resultId, status: "done" };
      } catch (err) {
        // Log do erro real para facilitar debugging
        console.error(
          `[AI] processPhotos FAILED for lead ${lead.id}, resultId ${resultId}:`,
          err
        );
        try {
          await db
            .update(aiResults)
            .set({
              processingStatus: "error",
              errorMessage: String(err),
            })
            .where(eq(aiResults.id, resultId));
        } catch (dbErr) {
          console.error("[AI] Failed to save error status to DB:", dbErr);
        }
        const errMsg = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao processar análise: ${errMsg}`,
        });
      }
    }),

  getResultByToken: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lead = await requireLeadByToken(input.sessionToken);
      const result = await db
        .select()
        .from(aiResults)
        .where(eq(aiResults.leadId, lead.id))
        .limit(1);
      return result[0] ?? null;
    }),

  getResultByLeadId: clinicProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db
        .select()
        .from(aiResults)
        .where(
          and(
            eq(aiResults.leadId, input.leadId),
            eq(aiResults.clinicId, ctx.clinic.id)
          )
        )
        .limit(1);
      return result[0] ?? null;
    }),
});

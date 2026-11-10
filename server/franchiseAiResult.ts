/**
 * Geração de análise + antes/depois (IA) para o funil da FRANQUIA (Supabase).
 * Reaproveita o motor do funil da clínica: invokeLLM (Forge) + hair_processor.py + storagePut.
 * Não depende do TiDB. O resultado é salvo em public.franchise_ai_results.
 */
import { supabaseAdmin } from "./supabase";
import { invokeLLM } from "./_core/llm";
import { storagePut, toFetchableUrl } from "./storage";

const SYSTEM_PROMPT = `Você é um especialista em análise capilar da clínica Homenz Advanced. O público atendido é EXCLUSIVAMENTE masculino. Analise a foto enviada e retorne um relatório estruturado em JSON.

REGRAS OBRIGATÓRIAS:
- Seja objetivo, empático e direto
- NUNCA faça diagnóstico médico ou prometa resultado clínico garantido
- NUNCA mencione transplante como opção da clínica — a Homenz NÃO realiza transplante
- Tom: especialista confiante, nunca vendedor
- Qualquer grau de calvície encaminha ao time de vendas — sem exceção

ESCALA DE NORWOOD-HAMILTON (referência obrigatória):
- Norwood I: sem recessão. Densidade 100%. Score base: 20-30.
- Norwood II: leve recessão temporal. Densidade 85-95%. Score base: 30-45.
- Norwood III: recessão temporal moderada. Densidade 70-85%. Score base: 50-65.
- Norwood IV: recessão severa + início no vertex. Densidade 50-70%. Score base: 65-80.
- Norwood V: frontal e vertex separados por faixa estreita. Densidade 30-50%. Score base: 75-85.
- Norwood VI: calvície extensa. Densidade 15-30%. Score base: 70-80.
- Norwood VII: apenas coroa lateral e nuca. Densidade <15%. Score base: 60-75.

SISTEMA DE LEAD SCORE (0-100):
- Urgência da calvície (40 pts) | Expectativa realista (30 pts) | Histórico de tratamentos (30 pts)
- Classificação: ≥70 = QUENTE | 40-69 = MORNO | <40 = FRIO

Retorne JSON com os campos especificados.`;

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    baldnessLevel: { type: "string", description: "Nível Norwood I a VII" },
    baldnessScale: { type: "string", description: "Sempre 'norwood'" },
    affectedAreas: { type: "array", items: { type: "string" }, description: "frontal, temporal, vertex, coronal, diffuse" },
    densityEstimate: { type: "string", description: "Estimativa de densidade por região" },
    recommendedTreatment: { type: "string", description: "Protocolo: micropigmentação, fibras ou combinado" },
    estimatedSessions: { type: "number", description: "Número de sessões estimadas" },
    analysisText: { type: "string", description: "Laudo em português, terminando com 'Agende sua avaliação gratuita com um especialista Homenz.'" },
    leadScore: { type: "number", description: "Pontuação 0-100" },
    leadScoreBreakdown: {
      type: "object",
      properties: {
        baldnessWeight: { type: "number" },
        expectationWeight: { type: "number" },
        historyWeight: { type: "number" },
      },
      required: ["baldnessWeight", "expectationWeight", "historyWeight"],
      additionalProperties: false,
    },
  },
  required: [
    "baldnessLevel", "baldnessScale", "affectedAreas", "densityEstimate",
    "recommendedTreatment", "estimatedSessions", "analysisText", "leadScore", "leadScoreBreakdown",
  ],
  additionalProperties: false,
} as const;

export async function generateFranchiseAiResult(leadId: string) {
  // 1. Buscar o lead
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select("id, franchise_id, name, age, hair_problem, hair_loss_type, photo_url, chat_answers")
    .eq("id", leadId)
    .single();
  if (error || !lead) throw new Error("Lead não encontrado");
  if (!lead.photo_url) throw new Error("Lead sem foto para análise");

  // 2. Reaproveitar resultado já concluído
  const { data: existing } = await supabaseAdmin
    .from("franchise_ai_results")
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (existing && existing.processing_status === "done") return existing;

  // 3. Criar/marcar como "processing"
  let resultId: string | undefined = existing?.id;
  if (!resultId) {
    const { data: ins } = await supabaseAdmin
      .from("franchise_ai_results")
      .insert({ lead_id: leadId, franchise_id: lead.franchise_id, processing_status: "processing" })
      .select("id")
      .single();
    resultId = ins?.id;
  } else {
    await supabaseAdmin
      .from("franchise_ai_results")
      .update({ processing_status: "processing", error_message: null })
      .eq("id", resultId);
  }

  try {
    // A foto fica num bucket privado: LLM e motores de imagem recebem um link assinado.
    const photoUrl = await toFetchableUrl(lead.photo_url);

    // 4. Análise com LLM
    const answers = (lead.chat_answers ?? {}) as Record<string, unknown>;
    const analysisResp = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text" as const,
              text: `Paciente masculino: ${lead.name}, idade: ${lead.age ?? "não informada"}.\n\nDados do diagnóstico:\n- Problema: ${lead.hair_problem ?? "queda capilar"}\n- Região: ${lead.hair_loss_type ?? "não informada"}\n- Respostas do quiz: ${JSON.stringify(answers)}\n\nAnalise a foto enviada aplicando obrigatoriamente a Escala de Norwood-Hamilton. Termine o analysisText SEMPRE com: 'Agende sua avaliação gratuita com um especialista Homenz.'`,
            },
            { type: "image_url" as const, image_url: { url: photoUrl, detail: "high" as const } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "hair_analysis", strict: true, schema: ANALYSIS_SCHEMA },
      },
    });
    const rawContent = analysisResp.choices[0]?.message?.content;
    const analysis = JSON.parse(typeof rawContent === "string" ? rawContent : "{}");

    // 5. Imagem "depois": mesma cascata de motores do funil da clínica (routers/ai.ts).
    // 1º fal kontext (melhor/consistente) → 2º Gemini (fallback) → senão foto original.
    // (O motor Python/OpenCV antigo crashava em produção: cv2 sem 'data'.)
    let afterImageUrl: string = lead.photo_url;
    try {
      let afterBuffer: Buffer;
      try {
        console.log("[franchiseAI] Running fal kontext hair fill...");
        const { falHairFill } = await import("./falHairFill");
        afterBuffer = await falHairFill(photoUrl);
        console.log("[franchiseAI] fal kontext ok");
      } catch (falErr) {
        console.warn("[franchiseAI] fal falhou, caindo pro Gemini:", falErr);
        const { geminiHairFill } = await import("./geminiHairFill");
        afterBuffer = await geminiHairFill(photoUrl);
        console.log("[franchiseAI] Gemini ok");
      }
      const { url } = await storagePut(`franchise-ai/${resultId}-after.png`, afterBuffer, "image/png");
      afterImageUrl = url;
    } catch (imgErr) {
      console.warn("[franchiseAI] todos os motores falharam, usando a foto original:", imgErr);
    }

    // 6. Salvar resultado
    const { data: saved } = await supabaseAdmin
      .from("franchise_ai_results")
      .update({
        analysis_text: analysis.analysisText,
        baldness_level: analysis.baldnessLevel,
        baldness_scale: analysis.baldnessScale,
        affected_areas: analysis.affectedAreas,
        density_estimate: analysis.densityEstimate,
        before_image_url: lead.photo_url,
        after_image_url: afterImageUrl,
        recommended_treatment: analysis.recommendedTreatment,
        estimated_sessions: analysis.estimatedSessions,
        lead_score: analysis.leadScore,
        lead_score_breakdown: analysis.leadScoreBreakdown,
        processing_status: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", resultId)
      .select("*")
      .single();

    // 7. Atualizar o lead com o score/temperatura
    const temperature = analysis.leadScore >= 70 ? "hot" : analysis.leadScore >= 40 ? "warm" : "cold";
    await supabaseAdmin
      .from("leads")
      .update({ lead_score: analysis.leadScore, temperature, funnel_step: "ai_done", updated_at: new Date().toISOString() })
      .eq("id", leadId);

    return saved;
  } catch (err) {
    if (resultId) {
      await supabaseAdmin
        .from("franchise_ai_results")
        .update({ processing_status: "error", error_message: String(err) })
        .eq("id", resultId);
    }
    throw err;
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { leadId, photoUrl, analysisType } = await req.json();

    if (!leadId || !photoUrl) {
      return new Response(JSON.stringify({ error: "leadId and photoUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Analisar a foto com GPT-4 Vision
    const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise esta foto de couro cabeludo/cabelo masculino e forneça:
1. Grau de queda capilar (escala Norwood 1-7)
2. Área afetada (frontal, coronal, vertex, difusa)
3. Densidade capilar estimada (alta/média/baixa)
4. Recomendação de tratamento (prioridade: alta/média/baixa)
5. Observações relevantes

Responda em JSON com campos: norwood_scale, affected_area, density, treatment_priority, observations`,
              },
              {
                type: "image_url",
                image_url: { url: photoUrl, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!visionResponse.ok) {
      throw new Error(`Vision API error: ${await visionResponse.text()}`);
    }

    const visionResult = await visionResponse.json();
    const analysisText = visionResult.choices[0]?.message?.content ?? "{}";

    let analysis: Record<string, unknown> = {};
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch {
      analysis = { raw: analysisText };
    }

    // Gerar imagem "depois" com DALL-E se solicitado
    let afterImageUrl: string | null = null;
    if (analysisType === "before_after") {
      const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: `Professional photo of a man with full, thick, healthy hair after successful hair restoration treatment. 
Natural looking result, same facial features and skin tone as the original. 
Studio lighting, high quality, photorealistic. 
Hair density: full coverage on top of head, natural hairline.`,
          size: "1024x1024",
          quality: "standard",
          n: 1,
        }),
      });

      if (dalleResponse.ok) {
        const dalleResult = await dalleResponse.json();
        afterImageUrl = dalleResult.data?.[0]?.url ?? null;
      }
    }

    // Salvar resultado no banco
    await supabase
      .from("leads")
      .update({
        ai_analysis: analysis,
        after_photo_url: afterImageUrl,
        photo_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    return new Response(
      JSON.stringify({ analysis, afterImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

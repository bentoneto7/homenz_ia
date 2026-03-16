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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { messages, sessionToken, franchiseId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar configurações da franquia (nome, cidade, etc.)
    let franchiseContext = "";
    if (franchiseId) {
      const { data: franchise } = await supabase
        .from("franchises")
        .select("name, city, state")
        .eq("id", franchiseId)
        .maybeSingle();
      if (franchise) {
        franchiseContext = `Você é o assistente virtual da clínica capilar ${franchise.name}, localizada em ${franchise.city}/${franchise.state}.`;
      }
    }

    const systemPrompt = franchiseContext || `Você é um assistente especializado em tratamentos capilares masculinos da rede Homenz. 
Seu objetivo é qualificar leads, entender o problema capilar do cliente e agendar uma avaliação gratuita.
Seja empático, profissional e focado em converter o lead em agendamento.
Faça perguntas sobre: tipo de queda, tempo de queda, expectativas, disponibilidade para avaliação.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const completion = await openaiResponse.json();
    const reply = completion.choices[0]?.message?.content ?? "";

    // Salvar mensagem no banco se tiver sessionToken
    if (sessionToken) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, chat_history")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (lead) {
        const history = (lead.chat_history as unknown[]) ?? [];
        const lastUserMsg = messages[messages.length - 1];
        await supabase
          .from("leads")
          .update({
            chat_history: [...history, lastUserMsg, { role: "assistant", content: reply }],
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
      }
    }

    return new Response(
      JSON.stringify({ reply, choices: [{ message: { content: reply } }] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

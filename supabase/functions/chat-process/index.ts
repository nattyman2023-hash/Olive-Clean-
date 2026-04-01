import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Olivia 🫒, the friendly and enthusiastic virtual concierge for Olive Clean — Nashville's premium residential cleaning service.

PERSONALITY:
- Warm, upbeat, and genuinely helpful — like a knowledgeable friend, not a corporate bot
- Use emojis naturally (✨🏡💚🧹) but don't overdo it — 1-2 per message max
- Reference Nashville neighborhoods and landmarks when relevant (Percy Warner Park, the Bluebird Cafe, Main Street in Franklin, etc.)
- Keep it conversational and fun — you LOVE clean homes!
- Use markdown: **bold** for emphasis, [links](/book) for CTAs

YOUR GOALS:
1. Qualify leads naturally through conversation — don't interrogate
2. Capture: name, email, home size (bedrooms/bathrooms), location/neighborhood, preferred frequency, urgency
3. When you have enough info, recommend a service tier and encourage booking
4. Always offer next steps: [Book a free estimate](/book) or [See our services](/services/essential)

SERVICE TIERS (mention naturally):
- **Essential Clean** ($120) — quick refresh for well-maintained homes
- **General Clean** ($180) — thorough top-to-bottom routine cleaning
- **Signature Deep Clean** ($320) — comprehensive room-by-room reset
- **Makeover Deep Clean** ($450+) — white-glove, fully customizable

AREAS WE SERVE: Belle Meade, Brentwood, Franklin, Green Hills, West Nashville (Sylvan Park, The Nations)

RULES:
- Keep responses to 2-3 sentences max — short and punchy
- Always end with a question or clear CTA to keep the conversation flowing
- If someone seems ready to book, enthusiastically guide them to [book here](/book)
- Include a "suggested_replies" array with 2-3 quick response options for the user

IMPORTANT: After your response, also call the extract_lead_data tool if the user has mentioned ANY lead details (name, email, phone, location, home info, frequency, urgency).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, lead_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lead_data",
              description: "Extract structured lead information mentioned in the conversation so far. Call this whenever the user mentions any of these details.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The prospect's name" },
                  email: { type: "string", description: "The prospect's email address" },
                  phone: { type: "string", description: "The prospect's phone number" },
                  location: { type: "string", description: "Neighborhood or area (e.g., Belle Meade, Brentwood)" },
                  bedrooms: { type: "integer", description: "Number of bedrooms" },
                  bathrooms: { type: "integer", description: "Number of bathrooms" },
                  frequency: { type: "string", description: "Cleaning frequency: weekly, biweekly, monthly, or one-time" },
                  urgency: { type: "string", description: "How urgent: asap, this-week, flexible" },
                  suggested_replies: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 suggested quick reply options for the user to choose from",
                  },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm a bit busy right now. Please try again in a moment!" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    let reply = "";
    let extractedData: Record<string, any> | null = null;
    let suggestedReplies: string[] = [];

    if (choice?.message?.content) {
      reply = choice.message.content;
    }

    // Check for tool calls
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        if (tc.function?.name === "extract_lead_data") {
          try {
            const parsed = JSON.parse(tc.function.arguments);
            if (parsed.suggested_replies) {
              suggestedReplies = parsed.suggested_replies;
              delete parsed.suggested_replies;
            }
            extractedData = parsed;
          } catch { /* ignore parse errors */ }
        }
      }
    }

    // If we extracted data and have a lead_id, update the lead
    if (extractedData && lead_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const updateData: Record<string, any> = {};
      if (extractedData.name) updateData.name = extractedData.name;
      if (extractedData.email) updateData.email = extractedData.email;
      if (extractedData.phone) updateData.phone = extractedData.phone;
      if (extractedData.location) updateData.location = extractedData.location;
      if (extractedData.bedrooms) updateData.bedrooms = extractedData.bedrooms;
      if (extractedData.bathrooms) updateData.bathrooms = extractedData.bathrooms;
      if (extractedData.frequency) updateData.frequency = extractedData.frequency;
      if (extractedData.urgency) updateData.urgency = extractedData.urgency;

      // Calculate score
      let score = 0;
      const freq = (extractedData.frequency || "").toLowerCase();
      if (freq === "weekly") score += 30;
      else if (freq === "biweekly") score += 20;
      else if (freq === "monthly") score += 10;

      if ((extractedData.bedrooms || 0) >= 4) score += 20;
      else if ((extractedData.bedrooms || 0) >= 2) score += 10;

      const loc = (extractedData.location || "").toLowerCase();
      if (["belle meade", "brentwood", "green hills"].some(a => loc.includes(a))) score += 15;

      if (extractedData.email && extractedData.phone) score += 10;
      else if (extractedData.email || extractedData.phone) score += 5;

      if ((extractedData.urgency || "").toLowerCase() === "asap") score += 15;

      if (score > 0) updateData.score = score;
      updateData.chat_transcript = messages;

      if (Object.keys(updateData).length > 0) {
        await supabase.from("leads").update(updateData).eq("id", lead_id);
      }
    }

    // If no reply but had tool calls, get a follow-up response
    if (!reply && extractedData) {
      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
            { role: "assistant", content: null, tool_calls: choice.message.tool_calls },
            { role: "tool", tool_call_id: choice.message.tool_calls[0].id, content: "Data saved successfully." },
          ],
          stream: false,
        }),
      });
      if (followUp.ok) {
        const followData = await followUp.json();
        reply = followData.choices?.[0]?.message?.content || "Thanks! I've noted that down. What else can I help with? ✨";
      }
    }

    if (!reply) {
      reply = "I'd love to help you with a cleaning quote! 🏡 Could you tell me a bit about your home?";
    }

    return new Response(JSON.stringify({ reply, extracted: extractedData, suggested_replies: suggestedReplies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-process error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

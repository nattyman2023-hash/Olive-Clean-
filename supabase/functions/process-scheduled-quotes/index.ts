import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find quotes due for sending
    const now = new Date().toISOString();
    const { data: dueQuotes, error } = await supabaseAdmin
      .from("estimates")
      .select("*, clients(name, email)")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (error) {
      console.error("Failed to fetch scheduled quotes:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    for (const est of dueQuotes || []) {
      const clientEmail = est.clients?.email;
      if (!clientEmail) continue;

      // Send the email
      const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "").replace("https://", "") || "";
      await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "estimate-sent",
          recipientEmail: clientEmail,
          idempotencyKey: `scheduled-quote-${est.id}-${Date.now()}`,
          templateData: {
            clientName: est.clients?.name,
            estimateNumber: est.estimate_number,
            total: Number(est.total).toFixed(2),
            validUntil: est.valid_until
              ? new Date(est.valid_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : undefined,
            approvalToken: est.approval_token,
          },
        },
      });

      // Update status
      await supabaseAdmin
        .from("estimates")
        .update({ status: "sent", sent_at: now })
        .eq("id", est.id);

      sentCount++;
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-scheduled-quotes error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

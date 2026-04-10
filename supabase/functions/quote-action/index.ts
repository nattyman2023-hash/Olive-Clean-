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
    const { token, action } = await req.json();
    if (!token || !action || !["view", "approve"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find estimate by token
    const { data: estimate, error: fetchErr } = await supabaseAdmin
      .from("estimates")
      .select("*, clients(name)")
      .eq("approval_token", token)
      .maybeSingle();

    if (fetchErr || !estimate) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "view") {
      // Increment view count, set viewed_at on first view, update status
      const updates: Record<string, unknown> = {
        view_count: (estimate.view_count || 0) + 1,
      };
      if (!estimate.viewed_at) {
        updates.viewed_at = new Date().toISOString();
      }
      // Update status to 'viewed' if currently 'sent'
      if (estimate.status === "sent") {
        updates.status = "viewed";
      }

      await supabaseAdmin.from("estimates").update(updates).eq("id", estimate.id);

      return new Response(JSON.stringify({ quote: estimate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      if (estimate.status === "accepted") {
        return new Response(JSON.stringify({ quote: estimate, message: "Already approved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("estimates")
        .update({
          status: "accepted",
          approved_at: new Date().toISOString(),
        })
        .eq("id", estimate.id);

      return new Response(JSON.stringify({ success: true, message: "Quote approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

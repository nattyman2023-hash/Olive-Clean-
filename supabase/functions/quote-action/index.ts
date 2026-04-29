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
    const { token, action, reason } = await req.json();
    if (!token || !action || !["view", "approve", "decline"].includes(action)) {
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
          accepted_via: "customer",
        })
        .eq("id", estimate.id);

      // Auto-create job from accepted quote
      const serviceName = estimate.items?.[0]?.description || "Cleaning Service";
      const { data: newJob } = await supabaseAdmin.from("jobs").insert({
        client_id: estimate.client_id,
        service: serviceName,
        scheduled_at: new Date().toISOString(),
        price: estimate.total,
        notes: `Auto-created from approved quote ${estimate.estimate_number}`,
        status: "scheduled",
      }).select("id").single();

      // Auto-create draft invoice (linked) so finance can finalize later
      await supabaseAdmin.from("invoices").insert({
        client_id: estimate.client_id,
        estimate_id: estimate.id,
        invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
        status: "draft",
        items: estimate.items,
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        total: estimate.total,
        notes: `Draft from accepted quote ${estimate.estimate_number}`,
      });

      // Convert any matching lead so it leaves the active Leads board
      if (newJob?.id) {
        await supabaseAdmin
          .from("leads")
          .update({ status: "converted", converted_job_id: newJob.id })
          .eq("email", (estimate as any).client_email || "")
          .neq("status", "converted");
      }

      return new Response(JSON.stringify({ success: true, message: "Quote approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "decline") {
      if (estimate.status === "declined") {
        return new Response(JSON.stringify({ quote: estimate, message: "Already declined" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabaseAdmin
        .from("estimates")
        .update({
          status: "declined",
          declined_at: new Date().toISOString(),
          decline_reason: typeof reason === "string" ? reason.slice(0, 500) : null,
        })
        .eq("id", estimate.id);
      return new Response(JSON.stringify({ success: true, message: "Quote declined" }), {
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

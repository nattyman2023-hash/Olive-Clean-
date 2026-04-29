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
      // Idempotent: already converted?
      if (estimate.status === "converted" && (estimate as any).converted_job_id) {
        return new Response(
          JSON.stringify({ success: true, message: "Already converted", jobId: (estimate as any).converted_job_id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const items = Array.isArray(estimate.items) ? estimate.items : [];
      const serviceName = items[0]?.description || "Cleaning Service";
      const scheduledAt = new Date().toISOString();

      // 1. Create job
      const { data: newJob, error: jobErr } = await supabaseAdmin
        .from("jobs")
        .insert({
          client_id: estimate.client_id,
          service: serviceName,
          scheduled_at: scheduledAt,
          price: estimate.total,
          status: "scheduled",
          source: "quote",
          notes: `From quote ${estimate.estimate_number} (accepted by customer)`,
        })
        .select("id")
        .single();
      if (jobErr || !newJob) {
        return new Response(JSON.stringify({ error: "Failed to create job" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Mark estimate converted (skipping intermediate "accepted")
      await supabaseAdmin
        .from("estimates")
        .update({
          status: "converted",
          approved_at: new Date().toISOString(),
          accepted_via: "customer",
          converted_job_id: newJob.id,
        })
        .eq("id", estimate.id);

      // 3. Draft invoice if not present
      const { data: existingInv } = await supabaseAdmin
        .from("invoices")
        .select("id")
        .eq("estimate_id", estimate.id)
        .maybeSingle();
      if (!existingInv) {
        await supabaseAdmin.from("invoices").insert({
          client_id: estimate.client_id,
          estimate_id: estimate.id,
          job_id: newJob.id,
          invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
          status: "draft",
          items: estimate.items,
          subtotal: estimate.subtotal,
          tax_rate: estimate.tax_rate,
          tax_amount: estimate.tax_amount,
          total: estimate.total,
          notes: `Draft from accepted quote ${estimate.estimate_number}`,
        });
      }

      // 4. Audit notes
      await supabaseAdmin.from("crm_notes").insert([
        {
          parent_type: "estimate",
          parent_id: estimate.id,
          content: `Quote accepted by customer via email link — Job #${newJob.id.slice(0, 8)} created.`,
          note_type: "system",
        },
        {
          parent_type: "job",
          parent_id: newJob.id,
          content: `Created from quote ${estimate.estimate_number} (accepted by customer).`,
          note_type: "system",
        },
      ]);

      // 5. Boomerang lead
      const clientEmail = (estimate.clients as any)?.email || "";
      if (clientEmail) {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("id")
          .eq("email", clientEmail)
          .neq("status", "converted")
          .maybeSingle();
        if (lead) {
          await supabaseAdmin
            .from("leads")
            .update({ status: "converted", converted_job_id: newJob.id })
            .eq("id", lead.id);
          await supabaseAdmin.from("crm_notes").insert({
            parent_type: "lead",
            parent_id: lead.id,
            content: `Lead converted via accepted quote ${estimate.estimate_number}.`,
            note_type: "system",
          });
        }
      }

      // 6. Notify admins
      const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
      if (admins && admins.length) {
        await supabaseAdmin.from("notifications").insert(
          admins.map((a: { user_id: string }) => ({
            user_id: a.user_id,
            type: "quote_converted",
            title: `Quote ${estimate.estimate_number} accepted — job created`,
            body: `${(estimate.clients as any)?.name || "Client"} · $${Number(estimate.total).toFixed(2)}`,
            metadata: { estimate_id: estimate.id, job_id: newJob.id },
          }))
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Quote approved", jobId: newJob.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

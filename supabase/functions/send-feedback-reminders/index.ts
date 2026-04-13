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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find completed jobs 24h+ ago with no feedback and not yet emailed
    const { data: jobs, error: queryErr } = await supabase
      .from("jobs")
      .select("id, client_id, service, scheduled_at, completed_at, feedback_email_sent")
      .eq("status", "completed")
      .eq("feedback_email_sent", false)
      .lt("completed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (queryErr) throw queryErr;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No jobs need feedback reminders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out jobs that already have feedback
    const jobIds = jobs.map((j: any) => j.id);
    const { data: existingFeedback } = await supabase
      .from("feedback")
      .select("job_id")
      .in("job_id", jobIds);

    const feedbackJobIds = new Set((existingFeedback || []).map((f: any) => f.job_id));
    const jobsNeedingReminder = jobs.filter((j: any) => !feedbackJobIds.has(j.id));

    let sent = 0;
    const siteUrl = "https://oliveclean.co";

    for (const job of jobsNeedingReminder) {
      // Get client email
      const { data: client } = await supabase
        .from("clients")
        .select("email, name")
        .eq("id", job.client_id)
        .single();

      if (!client?.email) {
        // Mark as sent to avoid retrying clients with no email
        await supabase.from("jobs").update({ feedback_email_sent: true }).eq("id", job.id);
        continue;
      }

      const feedbackUrl = `${siteUrl}/feedback/${job.id}`;
      const serviceName = job.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

      // Send feedback request email
      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "feedback-request",
          recipientEmail: client.email,
          idempotencyKey: `feedback-reminder-${job.id}`,
          templateData: {
            clientName: client.name,
            service: serviceName,
            feedbackUrl,
          },
        },
      });

      if (!sendErr) {
        await supabase.from("jobs").update({ feedback_email_sent: true }).eq("id", job.id);
        sent++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sent} feedback reminder(s)`, total: jobsNeedingReminder.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-feedback-reminders error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

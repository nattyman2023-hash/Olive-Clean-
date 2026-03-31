import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find jobs scheduled in the next 24 hours with status "scheduled"
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, service, scheduled_at, client_id, clients(name, email)")
      .eq("status", "scheduled")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", tomorrow.toISOString());

    if (jobsError) {
      console.error("Failed to query jobs:", jobsError);
      return new Response(JSON.stringify({ error: jobsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const job of jobs || []) {
      const client = job.clients as any;
      if (!client?.email) continue;

      const scheduledDate = new Date(job.scheduled_at);

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "job-reminder",
          recipientEmail: client.email,
          idempotencyKey: `job-reminder-${job.id}`,
          templateData: {
            clientName: client.name,
            service: job.service,
            date: scheduledDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
            time: scheduledDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
          },
        },
      });
      sent++;
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sent }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-job-reminders error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { event_type, client_id, job_id } = await req.json();

    if (!event_type || !client_id) {
      return new Response(
        JSON.stringify({ error: "event_type and client_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate event
    const { data: existing } = await supabase
      .from("lifecycle_events")
      .select("id")
      .eq("client_id", client_id)
      .eq("event_type", event_type)
      .eq("job_id", job_id || null)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: "Event already sent", duplicate: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client info
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("name, email")
      .eq("id", client_id)
      .single();

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the event
    await supabase.from("lifecycle_events").insert({
      client_id,
      job_id: job_id || null,
      event_type,
      channel: "email",
    });

    // For now, log the event. Email sending will integrate with email infrastructure once available.
    console.log(`Lifecycle event: ${event_type} for ${client.name} (${client.email})`);

    return new Response(
      JSON.stringify({ success: true, event_type, client: client.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Lifecycle notify error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

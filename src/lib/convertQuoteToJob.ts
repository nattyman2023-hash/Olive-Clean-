import { supabase } from "@/integrations/supabase/client";

export interface ConvertResult {
  jobId: string;
  alreadyConverted: boolean;
}

/**
 * Idempotent quote → job conversion.
 * - Marks estimate as 'converted' and stamps converted_job_id.
 * - Creates the job (source='quote') if not already created.
 * - Creates a draft invoice linked to the estimate.
 * - Writes audit notes on estimate, job, and (if matched) lead.
 * - Notifies admins.
 */
export async function convertQuoteToJob(
  estimateId: string,
  opts: { scheduledAt?: string; actorLabel?: string } = {}
): Promise<ConvertResult> {
  const { data: est, error } = await supabase
    .from("estimates")
    .select("*, clients(name, email)")
    .eq("id", estimateId)
    .maybeSingle();
  if (error || !est) throw new Error("Quote not found");

  // Idempotent short-circuit
  if (est.status === "converted" && (est as any).converted_job_id) {
    return { jobId: (est as any).converted_job_id, alreadyConverted: true };
  }

  const items: any[] = Array.isArray(est.items) ? (est.items as any[]) : [];
  const serviceName = items[0]?.description || "Cleaning Service";
  const scheduledAt = opts.scheduledAt || new Date().toISOString();

  // 1. Create job
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      client_id: est.client_id,
      service: serviceName,
      scheduled_at: scheduledAt,
      price: est.total,
      status: "scheduled",
      source: "quote",
      notes: `From quote ${est.estimate_number}`,
    } as any)
    .select("id")
    .single();
  if (jobErr || !job) throw new Error(jobErr?.message || "Failed to create job");

  // 2. Mark estimate converted
  const { error: estErr } = await supabase
    .from("estimates")
    .update({
      status: "converted",
      approved_at: est.approved_at || new Date().toISOString(),
      converted_job_id: job.id,
    } as any)
    .eq("id", est.id);
  if (estErr) {
    // Rollback the orphan job so we don't leave an unlinked record
    await supabase.from("jobs").delete().eq("id", job.id);
    throw new Error(`Failed to mark estimate converted: ${estErr.message}`);
  }

  // 3. Draft invoice (only if none exists for this estimate)
  const { data: existingInv } = await supabase
    .from("invoices")
    .select("id")
    .eq("estimate_id", est.id)
    .maybeSingle();
  if (!existingInv) {
    await supabase.from("invoices").insert({
      client_id: est.client_id,
      estimate_id: est.id,
      job_id: job.id,
      invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
      status: "draft",
      items: est.items as any,
      subtotal: est.subtotal,
      tax_rate: est.tax_rate,
      tax_amount: est.tax_amount,
      total: est.total,
      notes: `Draft from accepted quote ${est.estimate_number}`,
    });
  }

  // 4. Audit notes
  const { data: { user } } = await supabase.auth.getUser();
  const actor = opts.actorLabel || (user?.email ? `admin (${user.email})` : "admin");
  await supabase.from("crm_notes").insert([
    {
      parent_type: "estimate",
      parent_id: est.id,
      author_id: user?.id || null,
      content: `Converted to job — scheduled ${new Date(scheduledAt).toLocaleString()}. Created by ${actor}.`,
      note_type: "system",
    },
    {
      parent_type: "job",
      parent_id: job.id,
      author_id: user?.id || null,
      content: `Created from accepted quote ${est.estimate_number} (${actor}).`,
      note_type: "system",
    },
  ]);

  // 5. Boomerang lead
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("email", (est.clients as any)?.email || "")
    .neq("status", "converted")
    .maybeSingle();
  if (lead) {
    await supabase.from("leads").update({ status: "converted", converted_job_id: job.id } as any).eq("id", lead.id);
    await supabase.from("crm_notes").insert({
      parent_type: "lead",
      parent_id: lead.id,
      author_id: user?.id || null,
      content: `Lead converted via accepted quote ${est.estimate_number}.`,
      note_type: "system",
    });
  }

  // 6. Notify admins
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  if (admins && admins.length) {
    await supabase.from("notifications").insert(
      admins.map((a: any) => ({
        user_id: a.user_id,
        type: "quote_converted",
        title: `Quote ${est.estimate_number} accepted — job created`,
        body: `${(est.clients as any)?.name || "Client"} · $${Number(est.total).toFixed(2)}`,
        metadata: { estimate_id: est.id, job_id: job.id } as any,
      }))
    );
  }

  return { jobId: job.id, alreadyConverted: false };
}

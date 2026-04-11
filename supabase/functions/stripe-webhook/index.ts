import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Server misconfigured", { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Received event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoice_id;
    const jobId = session.metadata?.job_id;
    const tipAmountRaw = session.metadata?.tip_amount;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (invoiceId) {
      const { error } = await supabaseAdmin
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoiceId);

      if (error) {
        console.error("Failed to update invoice:", error.message);
        return new Response("DB update failed", { status: 500 });
      }

      console.log(`Invoice ${invoiceId} marked as paid`);

      // Log payment in comms log
      await supabaseAdmin.from("email_send_log").insert({
        recipient_email: session.customer_email || session.customer_details?.email || "unknown",
        template_name: "payment-received",
        status: "sent",
        metadata: {
          invoice_id: invoiceId,
          amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : null,
          stripe_session_id: session.id,
        },
      });

      // Fetch invoice number for notification
      const { data: inv } = await supabaseAdmin
        .from("invoices")
        .select("invoice_number, clients(name)")
        .eq("id", invoiceId)
        .maybeSingle();

      // Notify finance/admin users
      const { data: financeUsers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "finance"]);

      if (financeUsers && inv) {
        const clientName = (inv as any).clients?.name || "Client";
        for (const u of financeUsers) {
          await supabaseAdmin.from("notifications").insert({
            user_id: u.user_id,
            type: "invoice_paid",
            title: `Invoice ${inv.invoice_number} paid`,
            body: `${clientName} paid $${session.amount_total ? (session.amount_total / 100).toFixed(2) : "?"}`,
            metadata: { invoice_id: invoiceId },
          });
        }
      }
    } else {
      console.log("No invoice_id in session metadata — skipping");
    }

    // Save tip amount to the job if present
    if (jobId && tipAmountRaw) {
      const tipAmount = parseFloat(tipAmountRaw);
      if (!isNaN(tipAmount) && tipAmount > 0) {
        const { error: tipError } = await supabaseAdmin
          .from("jobs")
          .update({ tip_amount: tipAmount })
          .eq("id", jobId);

        if (tipError) {
          console.error("Failed to save tip:", tipError.message);
        } else {
          console.log(`Tip of $${tipAmount} saved for job ${jobId}`);
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

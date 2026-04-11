import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoiceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch invoice with client info
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("*, clients(name, email)")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice.status !== "draft") {
      return new Response(
        JSON.stringify({ error: "Only draft invoices can be finalized" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Build line items from invoice items
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.description || item.name || "Service",
        },
        unit_amount: Math.round((Number(item.amount || item.unit_price || 0)) * 100),
      },
      quantity: Number(item.quantity) || 1,
    }));

    // Add tax as a separate line item if present
    if (invoice.tax_amount && Number(invoice.tax_amount) > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: `Tax (${invoice.tax_rate}%)` },
          unit_amount: Math.round(Number(invoice.tax_amount) * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get("origin") || "https://olive-sanctuary-stack.lovable.app";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      metadata: {
        invoice_id: invoiceId,
        job_id: invoice.job_id || "",
      },
      success_url: `${origin}/client-dashboard?tab=invoices&paid=true`,
      cancel_url: `${origin}/client-dashboard?tab=invoices`,
      ...(invoice.clients?.email ? { customer_email: invoice.clients.email } : {}),
    });

    // Update invoice
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("invoices")
      .update({
        status: "sent",
        issued_at: now,
        stripe_checkout_url: session.url,
      })
      .eq("id", invoiceId);

    // Send branded email
    const clientEmail = invoice.clients?.email;
    const clientName = invoice.clients?.name;
    if (clientEmail) {
      await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-issued",
          recipientEmail: clientEmail,
          idempotencyKey: `invoice-issued-${invoiceId}`,
          templateData: {
            name: clientName,
            invoiceNumber: invoice.invoice_number,
            total: `$${Number(invoice.total).toFixed(2)}`,
            dueDate: invoice.due_date
              ? new Date(invoice.due_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : undefined,
            paymentUrl: session.url,
          },
        },
      });
    }

    // Notify finance/admin users
    const { data: financeUsers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "finance"]);

    if (financeUsers) {
      for (const u of financeUsers) {
        await supabaseAdmin.from("notifications").insert({
          user_id: u.user_id,
          type: "invoice_sent",
          title: `Invoice ${invoice.invoice_number} sent`,
          body: `Sent to ${clientName || clientEmail || "client"} for $${Number(invoice.total).toFixed(2)}`,
          metadata: { invoice_id: invoiceId },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, checkoutUrl: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("finalize-invoice error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

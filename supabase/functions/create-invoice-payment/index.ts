import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { invoiceId } = await req.json();
    if (!invoiceId) throw new Error("invoiceId is required");

    // Fetch invoice details using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: invoice, error: invError } = await supabaseAdmin
      .from("invoices")
      .select("*, clients(name, email, client_user_id)")
      .eq("id", invoiceId)
      .single();

    if (invError || !invoice) throw new Error("Invoice not found");

    // Verify the user owns this invoice
    if (invoice.clients?.client_user_id !== user.id) {
      throw new Error("Unauthorized");
    }

    if (invoice.status === "paid") {
      throw new Error("Invoice is already paid");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const lineItems = Array.isArray(invoice.items) ? invoice.items : [];
    const stripeLineItems = lineItems.length > 0
      ? lineItems.map((item: any) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.description || item.name || "Cleaning Service",
            },
            unit_amount: Math.round((Number(item.rate || item.unit_price || item.amount || 0)) * 100),
          },
          quantity: Number(item.qty || item.quantity || 1),
        }))
      : [{
          price_data: {
            currency: "usd",
            product_data: { name: `Invoice ${invoice.invoice_number}` },
            unit_amount: Math.round(Number(invoice.total) * 100),
          },
          quantity: 1,
        }];

    // Add tax as separate line item if present
    if (Number(invoice.tax_amount) > 0) {
      stripeLineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: `Tax (${invoice.tax_rate}%)` },
          unit_amount: Math.round(Number(invoice.tax_amount) * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: stripeLineItems,
      mode: "payment",
      metadata: { invoice_id: invoiceId, invoice_number: invoice.invoice_number },
      success_url: `${req.headers.get("origin")}/client-dashboard?payment=success&invoice=${invoice.invoice_number}`,
      cancel_url: `${req.headers.get("origin")}/client-dashboard?payment=canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

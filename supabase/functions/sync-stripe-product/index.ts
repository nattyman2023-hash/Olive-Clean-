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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const { serviceId, name, description, price } = await req.json();
    if (!serviceId || !name || !price) throw new Error("serviceId, name, and price are required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create Stripe product
    const product = await stripe.products.create({
      name,
      description: description || undefined,
      metadata: { service_template_id: serviceId },
    });

    // Create Stripe price (one-time)
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100),
      currency: "usd",
    });

    // Update service template with Stripe IDs
    const { error } = await supabase
      .from("service_templates")
      .update({
        stripe_product_id: product.id,
        stripe_price_id: stripePrice.id,
      })
      .eq("id", serviceId);

    if (error) throw new Error("Failed to update service template: " + error.message);

    return new Response(JSON.stringify({
      product_id: product.id,
      price_id: stripePrice.id,
    }), {
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

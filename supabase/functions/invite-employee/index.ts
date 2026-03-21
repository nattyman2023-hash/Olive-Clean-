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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await anonClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, name, employee_id } = await req.json();
    if (!email || !name || !employee_id) {
      return new Response(JSON.stringify({ error: "email, name, and employee_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://olive-sanctuary-stack.lovable.app";
    const redirectTo = `${origin}/reset-password`;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if auth user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === trimmedEmail
    );

    let authUserId: string;

    if (existingUser) {
      authUserId = existingUser.id;
      await adminClient.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });
    } else {
      const { data: invited, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(trimmedEmail, {
          data: { display_name: name },
          redirectTo,
        });

      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authUserId = invited.user.id;
    }

    // Ensure staff role
    const { data: hasRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", authUserId)
      .eq("role", "staff")
      .maybeSingle();

    if (!hasRole) {
      await adminClient.from("user_roles").insert({
        user_id: authUserId,
        role: "staff",
      });
    }

    // Link employee record to auth user
    await adminClient
      .from("employees")
      .update({ user_id: authUserId, email })
      .eq("id", employee_id);

    return new Response(
      JSON.stringify({ success: true, user_id: authUserId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("invite-employee error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

    // Verify the caller is an admin
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

    // Parse body
    const { email, name, client_id, address } = await req.json();
    if (!email || !name) {
      return new Response(JSON.stringify({ error: "email and name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if auth user with this email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let authUserId: string;

    if (existingUser) {
      authUserId = existingUser.id;
      // User exists — send a password recovery email so they can set/reset password
      const { error: resetError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      if (resetError) {
        console.error("Recovery link error:", resetError);
      }
      // Also send the actual reset email
      await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${supabaseUrl.replace(".supabase.co", ".lovable.app")}/reset-password`,
      });
    } else {
      // Invite new user — this sends an email with a setup link
      const { data: invited, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: { display_name: name },
          redirectTo: `${supabaseUrl.replace(".supabase.co", ".lovable.app")}/reset-password`,
        });

      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authUserId = invited.user.id;
    }

    // Ensure client role exists
    const { data: hasRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", authUserId)
      .eq("role", "client")
      .maybeSingle();

    if (!hasRole) {
      await adminClient.from("user_roles").insert({
        user_id: authUserId,
        role: "client",
      });
    }

    // Link or create client record
    if (client_id) {
      // Update existing client record
      await adminClient
        .from("clients")
        .update({ client_user_id: authUserId })
        .eq("id", client_id);
    } else {
      // Check if client with this email already exists
      const { data: existingClient } = await adminClient
        .from("clients")
        .select("id, client_user_id")
        .eq("email", email)
        .maybeSingle();

      if (existingClient) {
        if (!existingClient.client_user_id) {
          await adminClient
            .from("clients")
            .update({ client_user_id: authUserId })
            .eq("id", existingClient.id);
        }
      } else {
        // Create new client record
        await adminClient.from("clients").insert({
          name,
          email,
          address: address || null,
          client_user_id: authUserId,
          created_by: caller.id,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authUserId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("invite-client error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: "natalinog2002@yahoo.com",
    password: "Malta2016@//",
    email_confirm: true,
  });

  if (createError && !createError.message.includes("already been registered")) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
  }

  let userId = userData?.user?.id;

  // If user already exists, look them up
  if (!userId) {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users?.find((u) => u.email === "natalinog2002@yahoo.com");
    if (existing) {
      userId = existing.id;
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: "Malta2016@//" });
    } else {
      return new Response(JSON.stringify({ error: "Could not find or create user" }), { status: 400 });
    }
  }

  // Assign admin role (upsert)
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

  return new Response(
    JSON.stringify({ success: true, userId, roleError: roleError?.message }),
    { headers: { "Content-Type": "application/json" } }
  );
});

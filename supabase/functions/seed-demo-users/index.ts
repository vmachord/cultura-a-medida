import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const demos = [
    { email: "ciudadano@demo.com", password: "demo1234", role: "citizen", display_name: "Ciudadano Demo" },
    { email: "admin@demo.com", password: "demo1234", role: "admin", display_name: "Admin Demo" },
  ];

  const results: any[] = [];

  for (const d of demos) {
    // Try to find existing user
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === d.email);

    let userId: string;
    if (existing) {
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, {
        password: d.password,
        email_confirm: true,
        user_metadata: { display_name: d.display_name, role: d.role },
      });
      results.push({ email: d.email, status: "updated" });
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: d.email,
        password: d.password,
        email_confirm: true,
        user_metadata: { display_name: d.display_name, role: d.role },
      });
      if (error) {
        results.push({ email: d.email, error: error.message });
        continue;
      }
      userId = data.user!.id;
      results.push({ email: d.email, status: "created" });
    }

    // Ensure correct role in user_roles (trigger may have set citizen by default)
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: d.role });

    // Ensure profile exists
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!prof) {
      await supabase.from("profiles").insert({
        user_id: userId,
        display_name: d.display_name,
        onboarding_completed: d.role === "admin", // admin no necesita onboarding
      });
    } else if (d.role === "admin") {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", userId);
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, corsHeaders } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const input = await req.json();
    const { user } = await requireUser(req, input.user_id);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.from("email_connections")
      .select("smtp_host,smtp_port,smtp_user,from_name,from_email,created_at")
      .eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return Response.json({ ok: true, connection: data ?? null }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao consultar conexão" }, { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

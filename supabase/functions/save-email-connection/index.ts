import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";
import { encryptSecret } from "../_shared/crypto.ts";
import { requireUser, corsHeaders } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const input = await req.json();
    const { user } = await requireUser(req, input.user_id);
    const host = String(input.smtp_host || "").trim();
    const port = Number(input.smtp_port);
    const username = String(input.smtp_user || "").trim();
    const password = String(input.smtp_password || "");
    const fromName = String(input.from_name || "").trim();
    const fromEmail = String(input.from_email || "").trim();

    if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !username || !password || !fromEmail) {
      throw new Error("Preencha todos os dados SMTP corretamente");
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: username, pass: password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    await transport.verify();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("email_connections").upsert({
      user_id: user.id,
      smtp_host: host,
      smtp_port: port,
      smtp_user: username,
      smtp_password: await encryptSecret(password),
      from_name: fromName,
      from_email: fromEmail,
    }, { onConflict: "user_id" });

    return Response.json({ ok: true }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao salvar conexão" }, { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

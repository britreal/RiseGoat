import nodemailer from "npm:nodemailer";
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

    if (!host || !Number.isInteger(port) || !username || !password || !fromEmail) throw new Error("Preencha todos os dados SMTP");

    const transport = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user: username, pass: password },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    await transport.verify();
    await transport.sendMail({
      from: { name: fromName || user.email?.split("@")[0] || "RiseGoat", address: fromEmail },
      to: user.email,
      subject: "Teste de conexão — RiseGoat",
      text: "Sua conexão SMTP foi testada com sucesso. Este é um e-mail de teste da RiseGoat.",
      html: "<p>Sua conexão SMTP foi testada com sucesso.</p><p>Este é um e-mail de teste da <strong>RiseGoat</strong>.</p>",
    });

    return Response.json({ ok: true, message: "E-mail de teste enviado" }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao testar SMTP" }, { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

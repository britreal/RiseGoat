import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";
import { decryptSecret } from "../_shared/crypto.ts";
import { requireUser, corsHeaders } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const input = await req.json();
    const { user } = await requireUser(req, input.user_id);
    const campaignId = String(input.campaign_id || "");
    if (!campaignId) throw new Error("campaign_id é obrigatório");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: connection, error: connectionError } = await admin.from("email_connections").select("*").eq("user_id", user.id).maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection) throw new Error("Configure seu e-mail SMTP antes de enviar uma campanha");

    const { data: campaign, error: campaignError } = await admin.from("campaigns").select("*").eq("id", campaignId).eq("user_id", user.id).maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) throw new Error("Campanha não encontrada");

    const appOrigin = String(input.app_origin || "").replace(/\/$/, "");
    const { data: recipients, error: recipientsError } = await admin
      .from("newsletter_leads")
      .select("id,name,email,unsubscribe_token")
      .eq("user_id", user.id)
      .eq("marketing_consent", true)
      .is("unsubscribed_at", null);
    if (recipientsError) throw recipientsError;
    if (!recipients?.length) throw new Error("Sua lista não possui inscritos com consentimento de marketing ativo");

    const transport = nodemailer.createTransport({
      host: connection.smtp_host,
      port: connection.smtp_port,
      secure: connection.smtp_port === 465,
      auth: { user: connection.smtp_user, pass: await decryptSecret(connection.smtp_password) },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    });

    await admin.from("campaigns").update({ status: "sending", total_recipients: recipients.length, sent_count: 0, error_count: 0, last_error: "", updated_at: new Date().toISOString() }).eq("id", campaignId);

    let sent = 0;
    let errors = 0;
    for (const recipient of recipients) {
      try {
        await transport.sendMail({
          from: { name: connection.from_name || "RiseGoat", address: connection.from_email },
          to: recipient.email,
          subject: campaign.subject,
          text: campaign.body + (appOrigin && recipient.unsubscribe_token
            ? "\n\nCancelar inscrição: " + appOrigin + "/#/unsubscribe/" + recipient.unsubscribe_token
            : ""),
          html: campaign.body.replace(/\n/g, "<br>") + (appOrigin && recipient.unsubscribe_token
            ? '<br><br><hr><p style="font-size:12px;color:#777">Para cancelar sua inscrição: <a href="' + appOrigin + '/#/unsubscribe/' + recipient.unsubscribe_token + '">descadastrar</a>.</p>'
            : ""),
        });
        sent++;
        await admin.from("campaign_sends").upsert({
          campaign_id: campaignId, user_id: user.id, recipient_email: recipient.email,
          recipient_name: recipient.name || "", status: "sent", sent_at: new Date().toISOString(),
        }, { onConflict: "campaign_id,recipient_email" });
      } catch (error) {
        errors++;
        await admin.from("campaign_sends").upsert({
          campaign_id: campaignId, user_id: user.id, recipient_email: recipient.email,
          recipient_name: recipient.name || "", status: "error",
          error_message: error instanceof Error ? error.message.slice(0, 500) : "Erro de envio",
        }, { onConflict: "campaign_id,recipient_email" });
      }
    }

    const status = errors === recipients.length ? "error" : "sent";
    await admin.from("campaigns").update({
      status, sent_count: sent, error_count: errors,
      last_error: errors ? `${errors} destinatário(s) falharam` : "",
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);

    return Response.json({ ok: true, status, total: recipients.length, sent, errors }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao enviar campanha" }, { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

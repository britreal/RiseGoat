-- Long microblog posts open on their own public reading page.
-- Optional CTA text/link are configured from the Microblog editor.
ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS button_text text NOT NULL DEFAULT '';
ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS button_url text NOT NULL DEFAULT '';

-- The encrypted SMTP secret must never be readable by the browser/client.
DROP POLICY IF EXISTS "owner_select_email_connection" ON email_connections;

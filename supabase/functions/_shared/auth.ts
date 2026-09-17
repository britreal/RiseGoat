import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

export async function requireUser(req: Request, bodyUserId: string) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Não autenticado");

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || data.user.id !== bodyUserId) throw new Error("Usuário inválido");
  return { user: data.user, token };
}

export { corsHeaders };

import { createClient } from '@supabase/supabase-js';
import { decryptServiceRoleFromOfflineVault } from '../../security/offline-vault.mjs';

export function createOfflineAdminClient(){
  const url=process.env.SUPABASE_URL;
  if(!url)throw new Error('Defina SUPABASE_URL para o projeto alvo.');
  const key=decryptServiceRoleFromOfflineVault();
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}

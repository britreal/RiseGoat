import { createDecipheriv, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

export function decryptServiceRoleFromOfflineVault(){
  const passphrase=process.env.RISEGOAT_VAULT_PASSPHRASE;
  const file=resolve(process.env.RISEGOAT_VAULT_PATH||homedir()+'/.risegoat-vault/supabase-service-role.enc');
  if(!passphrase)throw new Error('Defina RISEGOAT_VAULT_PASSPHRASE no gerenciador de segredos da sessão.');
  const envelope=JSON.parse(readFileSync(file,'utf8'));
  if(envelope.version!==1||envelope.algorithm!=='aes-256-gcm'||envelope.kdf!=='scrypt')throw new Error('Formato de cofre desconhecido.');
  const salt=Buffer.from(envelope.salt,'hex'),iv=Buffer.from(envelope.iv,'hex');
  const key=scryptSync(passphrase,salt,32),decipher=createDecipheriv('aes-256-gcm',key,iv);
  decipher.setAuthTag(Buffer.from(envelope.tag,'hex'));
  const decrypted=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]);
  key.fill(0);
  const secret=decrypted.toString('utf8');decrypted.fill(0);
  return secret;
}

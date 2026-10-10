#!/usr/bin/env node
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const secret=process.env.SUPABASE_SERVICE_ROLE_KEY_TO_ENCRYPT;
const passphrase=process.env.RISEGOAT_VAULT_PASSPHRASE;
if(!secret||!passphrase||passphrase.length<16){
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY_TO_ENCRYPT e uma RISEGOAT_VAULT_PASSPHRASE com pelo menos 16 caracteres via seu gerenciador de segredos.');
  process.exit(2);
}
const target=resolve(process.env.RISEGOAT_VAULT_PATH||homedir()+'/.risegoat-vault/supabase-service-role.enc');
const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(passphrase,salt,32);
const cipher=createCipheriv('aes-256-gcm',key,iv);
const input=Buffer.from(secret,'utf8');
const ciphertext=Buffer.concat([cipher.update(input),cipher.final()]);
const envelope={version:1,algorithm:'aes-256-gcm',kdf:'scrypt',salt:salt.toString('hex'),iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex'),ciphertext:ciphertext.toString('base64')};
mkdirSync(dirname(target),{recursive:true,mode:0o700});
try{
  writeFileSync(target,JSON.stringify(envelope)+'\n',{mode:0o600,flag:'wx'});
  chmodSync(dirname(target),0o700);chmodSync(target,0o600);
}catch{
  console.error('Não foi possível criar o cofre (o arquivo pode já existir). Escolha outro caminho ou mova o cofre antigo com segurança.');
  process.exitCode=1;
}
input.fill(0);key.fill(0);ciphertext.fill(0);
delete process.env.SUPABASE_SERVICE_ROLE_KEY_TO_ENCRYPT;
if(!process.exitCode)console.log('Chave criptografada gravada fora do repositório: '+target);

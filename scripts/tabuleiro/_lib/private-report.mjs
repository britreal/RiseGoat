import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

export function writePrivateReport(name,data){
  const dir=resolve(process.env.RISEGOAT_RESEARCH_DIR||homedir()+'/.risegoat-research');
  mkdirSync(dir,{recursive:true,mode:0o700});
  const target=resolve(dir,name);
  writeFileSync(target,JSON.stringify(data,null,2)+'\n',{mode:0o600});
  return target;
}

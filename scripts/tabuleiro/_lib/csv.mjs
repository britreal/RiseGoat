export function parseCsv(input){
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(quoted){
      if(ch==='"'&&input[i+1]==='"'){value+='"';i++}
      else if(ch==='"')quoted=false;
      else value+=ch;
    }else if(ch==='"'&&value.length===0)quoted=true;
    else if(ch===','){row.push(value);value=''}
    else if(ch==='\n'){row.push(value.replace(/\r$/,''));if(row.some(v=>v.trim()))rows.push(row);row=[];value=''}
    else value+=ch;
  }
  if(value.length||row.length){row.push(value.replace(/\r$/,''));if(row.some(v=>v.trim()))rows.push(row)}
  if(!rows.length)return[];
  const headers=rows.shift().map(h=>h.trim().toLowerCase().replace(/^\uFEFF/,''));
  return rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,(values[index]||'').trim()])));
}
export function getField(row,names){
  for(const name of names){const value=row[name.toLowerCase()];if(value!==undefined&&value.trim()!=='')return value.trim()}
  return '';
}
export function cleanSlug(value){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
}
export function normalizeName(value){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

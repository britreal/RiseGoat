const encoder = new TextEncoder();

function bytes(text:string){ return encoder.encode(text); }
function u16(n:number){ return new Uint8Array([n&255,(n>>>8)&255]); }
function u32(n:number){ return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]); }
function join(chunks:Uint8Array[]){const total=chunks.reduce((s,c)=>s+c.length,0);const out=new Uint8Array(total);let p=0;for(const c of chunks){out.set(c,p);p+=c.length;}return out;}
function crc32(data:Uint8Array){let crc=0xffffffff;for(const b of data){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(entries:Array<{name:string;data:string|Uint8Array}>){
  const locals:Uint8Array[]=[];const centrals:Uint8Array[]=[];let offset=0;
  entries.forEach(e=>{const name=bytes(e.name),data=typeof e.data==='string'?bytes(e.data):e.data,crc=crc32(data);
    const local=join([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);locals.push(local);
    const central=join([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centrals.push(central);offset+=local.length;
  });
  const local=join(locals),central=join(centrals),end=join([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(central.length),u32(local.length),u16(0)]);return join([local,central,end]);
}
function xml(s:string){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function safeName(s:string){return s.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'livro';}
function toBlob(data:Uint8Array|Blob,type:string){return data instanceof Blob?data:new Blob([data],{type});}
export function downloadBookFile(blob:Blob,name:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  a.rel='noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function html(s:string){return xml(s).replace(/\r?\n\r?\n/g,'</p><p>').replace(/\r?\n/g,'<br/>');}

export function buildEpub(book:{title:string;subtitle:string;description:string;author_name:string;language:string;isbn:string},chapters:{title:string;content:string}[]){
  const items=chapters.map((ch,i)=>({id:'ch'+(i+1),file:'ch'+(i+1)+'.xhtml',title:ch.title,content:html(ch.content)}));
  const manifest=items.map(x=>'<item id="'+x.id+'" href="'+x.file+'" media-type="application/xhtml+xml"/>').join('');
  const spine=items.map(x=>'<itemref idref="'+x.id+'"/>').join('');
  const nav=items.map(x=>'<li><a href="'+x.file+'">'+xml(x.title)+'</a></li>').join('');
  const chaptersXml=items.map(x=>'<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/><title>'+xml(x.title)+'</title><link rel="stylesheet" href="style.css"/></head><body><h1>'+xml(x.title)+'</h1><p>'+x.content+'</p></body></html>');
  const opf='<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">'+xml(book.isbn||('risegoat-'+crypto.randomUUID()))+'</dc:identifier><dc:title>'+xml(book.title+(book.subtitle?' — '+book.subtitle:''))+'</dc:title><dc:creator>'+xml(book.author_name||'Autor')+'</dc:creator><dc:language>'+xml(book.language.toLowerCase())+'</dc:language><dc:description>'+xml(book.description||'')+'</dc:description></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/>'+manifest+'</manifest><spine>'+spine+'</spine></package>';
  const navXml='<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Sumário</title></head><body><nav epub:type="toc"><h1>Sumário</h1><ol>'+nav+'</ol></nav></body></html>';
  const container='<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
  const data=zip([{name:'mimetype',data:'application/epub+zip'},{name:'META-INF/container.xml',data:container},{name:'OEBPS/content.opf',data:opf},{name:'OEBPS/nav.xhtml',data:navXml},{name:'OEBPS/style.css',data:'body{font-family:serif;line-height:1.6;margin:8%;}h1{margin-bottom:2em;}'},...items.map((x,i)=>({name:'OEBPS/'+x.file,data:chaptersXml[i]}))]);
  return new Blob([data],{type:'application/epub+zip'});
}

export function buildDocx(book:{title:string;subtitle:string;author_name:string},chapters:{title:string;content:string}[]){
  const p=(s:string)=>s.split(/\n+/).filter(Boolean).map(x=>'<w:p><w:r><w:t xml:space="preserve">'+xml(x)+'</w:t></w:r></w:p>').join('');
  const body='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>'+xml(book.title)+'</w:t></w:r></w:p>'+ (book.subtitle?'<w:p><w:r><w:t>'+xml(book.subtitle)+'</w:t></w:r></w:p>':'') +(book.author_name?'<w:p><w:r><w:t>'+xml(book.author_name)+'</w:t></w:r></w:p>':'') +chapters.map(ch=>'<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>'+xml(ch.title)+'</w:t></w:r></w:p>'+p(ch.content)).join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>';
  const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  return new Blob([zip([{name:'[Content_Types].xml',data:types},{name:'_rels/.rels',data:rels},{name:'word/document.xml',data:body}])],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

function winAnsiByte(ch:string){
  const special:Record<string,number> = {
    '€':0x80,'‚':0x82,'ƒ':0x83,'„':0x84,'…':0x85,'†':0x86,'‡':0x87,'ˆ':0x88,'‰':0x89,'Š':0x8a,'‹':0x8b,'Œ':0x8c,'Ž':0x8e,
    '‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97,'˜':0x98,'™':0x99,'š':0x9a,'›':0x9b,'œ':0x9c,'ž':0x9e,'Ÿ':0x9f,
  };
  if(special[ch]!==undefined)return special[ch];
  const code=ch.charCodeAt(0);
  if(code<=0x7f || (code>=0xa0 && code<=0xff))return code;
  const fallback:Record<string,string> = {'\u00a0':' ','\u200b':' ','\u00ad':'-','\u2022':'*','\u2011':'-'};
  return (fallback[ch]??'?').charCodeAt(0);
}
function pdfTextHex(s:string){
  let hex='';
  for(const ch of s)hex+=winAnsiByte(ch).toString(16).padStart(2,'0');
  return hex;
}
export function buildPdf(book:{title:string;author_name:string},chapters:{title:string;content:string}[]){
  const pages:string[][]=[];let page:string[]=[];let y=760;
  const line=(s:string)=>{
    const words=s.split(/\s+/);let cur='';
    for(const w of words){
      if((cur+' '+w).trim().length>92){
        page.push(y+'|'+cur.trim());y-=15;
        if(y<60){pages.push(page);page=[];y=760;}
      }
      cur+=(cur?' ':'')+w;
    }
    if(cur){page.push(y+'|'+cur);y-=15;if(y<60){pages.push(page);page=[];y=760;}}
  };
  line(book.title);
  if(book.author_name)line(book.author_name);
  y-=15;
  chapters.forEach(ch=>{y-=10;line(ch.title);line(ch.content);y-=8;});
  if(page.length)pages.push(page);

  const objects:string[]=['','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  const pageIds:number[]=[];
  pages.forEach(p=>{
    const pageId=objects.length+1,contentId=objects.length+2;
    pageIds.push(pageId);
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>');
    const stream='BT\n/F1 11 Tf\n'+p.map(x=>{const [yy,...rest]=x.split('|');return '1 0 0 1 48 '+yy+' Tm <'+pdfTextHex(rest.join('|'))+'> Tj';}).join('\n')+'\nET';
    objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');
  });
  objects[0]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[1]='<< /Type /Pages /Kids ['+pageIds.map(x=>x+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
  let pdf='%PDF-1.4\n';const offsets:number[]=[0];
  objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
  const xref=pdf.length;
  pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return new Blob([pdf],{type:'application/pdf'});
}

export async function buildCoverPng(options:{title:string;subtitle:string;author:string;background:string;foreground:string;font:'serif'|'sans'|'mono';layout:'center'|'top'|'minimal'}){
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=2560;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponível');ctx.fillStyle=options.background;ctx.fillRect(0,0,1600,2560);ctx.fillStyle=options.foreground;ctx.textAlign='center';
  const wrap=(s:string,n:number)=>{const words=s.split(/\s+/),out:string[]=[];let line='';words.forEach(w=>{if((line+' '+w).trim().length>n){out.push(line.trim());line='';}line+=(line?' ':'')+w;});if(line)out.push(line.trim());return out;};
  const fontFamily=options.font==='sans'?'Arial':options.font==='mono'?'monospace':'Georgia';const startY=options.layout==='top'?520:options.layout==='minimal'?1040:920;ctx.font='bold 92px '+fontFamily;let y=startY;wrap(options.title,28).forEach(t=>{ctx.fillText(t,800,y);y+=105;});ctx.font='44px '+fontFamily;wrap(options.subtitle,48).forEach(t=>{ctx.fillText(t,800,y);y+=62;});ctx.font='38px Arial';ctx.fillText(options.author,800,2260);
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao gerar capa.')),'image/png'));
}

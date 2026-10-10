import { useMemo, useState } from 'react';
import { Download, Image, Loader2, ShieldCheck, X } from 'lucide-react';
import '@/lib/note-png-export.css';

type RatioKey='story'|'square'|'wide';
type CardMode='private'|'public-summary'|'public-labels';
type Props={title:string;content:string;labels:string[];checklist:string[];onClose:()=>void};

const RATIOS:Record<RatioKey,{width:number;height:number;label:string;destination:string}> = {
  story:{width:1080,height:1920,label:'9:16 · Story',destination:'Instagram Stories e TikTok'},
  square:{width:1080,height:1080,label:'1:1 · Feed',destination:'Feed social'},
  wide:{width:1920,height:1080,label:'16:9 · Horizontal',destination:'X e LinkedIn'},
};

function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  const radius=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+radius,y);ctx.lineTo(x+w-radius,y);ctx.arcTo(x+w,y,x+w,y+radius,radius);
  ctx.lineTo(x+w,y+h-radius);ctx.arcTo(x+w,y+h,x+w-radius,y+h,radius);
  ctx.lineTo(x+radius,y+h);ctx.arcTo(x,y+h,x,y+h-radius,radius);
  ctx.lineTo(x,y+radius);ctx.arcTo(x,y,x+radius,y);ctx.closePath();
}

function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number):string[]{
  const output:string[]=[];
  for(const paragraph of text.split('\n')){
    if(!paragraph.trim()){output.push('');continue}
    const words=paragraph.trim().split(/\s+/);let line='';
    for(const word of words){
      const candidate=line?line+' '+word:word;
      if(line&&ctx.measureText(candidate).width>maxWidth){output.push(line);line=word}else line=candidate;
    }
    if(line)output.push(line);
  }
  return output;
}

function layoutLabels(ctx:CanvasRenderingContext2D,labels:string[],maxWidth:number,fontSize:number,gap:number){
  ctx.font=fontSize+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const chips:{text:string;width:number;x:number;y:number}[]=[];
  let x=0,y=0,row=0;
  for(const label of labels){
    const text=label.length>36?label.slice(0,35)+'…':label;
    const width=ctx.measureText(text).width+28;
    if(x>0&&x+width>maxWidth){x=0;y+=fontSize+18;row++}
    chips.push({text,width,x,y});x+=width+gap;
  }
  return {chips,height:labels.length?y+fontSize+18:0,rows:labels.length?row+1:0};
}

export function NotePngExportDialog({title,content,labels,checklist,onClose}:Props){
  const [ratio,setRatio]=useState<RatioKey>('story');
  const [mode,setMode]=useState<CardMode>('private');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const ratioData=RATIOS[ratio];
  const resolvedTitle=title.trim()||'Uma ideia para guardar';
  const resolvedLabels=useMemo(()=>[...new Set(labels.map(x=>x.trim()).filter(Boolean))].slice(0,16),[labels]);
  const body=useMemo(()=>{
    const items=checklist.length?checklist.map(x=>'• '+x).join('\n'):'';
    return [content.trim(),items].filter(Boolean).join(content.trim()&&items?'\n\n':'');
  },[content,checklist]);
  const summary=useMemo(()=>{
    const line=body.split(/\n/).map(x=>x.replace(/^\s*[•\-*]\s*/, '').trim()).find(Boolean)||'';
    if(!line)return resolvedLabels.length?resolvedLabels.join(' · '):'Uma ideia para refletir.';
    return line.length>170?line.slice(0,167).trimEnd()+'…':line;
  },[body,resolvedLabels]);
  async function exportPng(){
    setBusy(true);setError('');
    try{
      const width=ratioData.width,height=ratioData.height;
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');
      if(!ctx){setError('Não foi possível preparar a imagem neste navegador.');return}
      ctx.fillStyle='#f2f1ec';ctx.fillRect(0,0,width,height);
      const margin=Math.round(width*.045),cardX=margin,cardY=margin,cardW=width-margin*2,cardH=height-margin*2;
      roundedRect(ctx,cardX+2,cardY+5,cardW,cardH,24);ctx.fillStyle='rgba(30,30,20,.045)';ctx.fill();
      roundedRect(ctx,cardX,cardY,cardW,cardH,24);ctx.fillStyle='#ffffff';ctx.fill();
      ctx.strokeStyle='#e7e6df';ctx.lineWidth=2;ctx.stroke();
      const pad=Math.round(width*.064),innerWidth=cardW-pad*2;
      let cursorY=cardY+pad;
      let titleSize=Math.round(width*(ratio==='wide'?.043:.051));
      let titleLines:string[]=[];
      while(titleSize>Math.round(width*.029)){
        ctx.font='700 '+titleSize+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        titleLines=wrapText(ctx,resolvedTitle,innerWidth);
        if(titleLines.length<=4&&titleLines.length*titleSize*1.12<cardH*.28)break;
        titleSize-=2;
      }
      ctx.fillStyle='#20211f';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.font='700 '+titleSize+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const titleLineHeight=titleSize*1.14;
      for(const line of titleLines){ctx.fillText(line,cardX+pad,cursorY);cursorY+=titleLineHeight}
      cursorY+=Math.round(width*.035);
      const footerTop=cardY+cardH-pad-34;
      if(mode!=='public-labels'){
        const displayedBody=mode==='public-summary'?summary:body;
        const labelsLayout=layoutLabels(ctx,resolvedLabels,innerWidth,Math.round(width*.018),Math.round(width*.008));
        const labelsHeight=labelsLayout.height;
        const bodyBottom=footerTop-(labelsHeight?labelsHeight+Math.round(width*.05):0);
        const availableHeight=bodyBottom-cursorY;
        let bodySize=Math.round(width*(ratio==='wide'?.022:.027));
        let bodyLines:string[]=[];
        while(bodySize>=Math.round(width*.013)){
          ctx.font='400 '+bodySize+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          bodyLines=wrapText(ctx,displayedBody||' ',innerWidth);
          if(bodyLines.length*bodySize*1.48<=availableHeight)break;
          bodySize-=1;
        }
        if(bodyLines.length*bodySize*1.48>availableHeight){
          setError(mode==='private'?'A nota é longa demais para caber inteira neste formato. Reduza o conteúdo ou escolha outro formato.':'O texto não cabe neste formato. Escolha outra proporção.');
          return;
        }
        ctx.font='400 '+bodySize+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle='#555750';ctx.textBaseline='top';
        const lineHeight=bodySize*1.48;
        for(const line of bodyLines){ctx.fillText(line,cardX+pad,cursorY);cursorY+=lineHeight}
        if(labelsHeight){
          cursorY=cardY+cardH-pad-34-labelsHeight;
          const labelFont=Math.round(width*.018),chipHeight=labelFont+18,gap=Math.round(width*.008);
          const finalLayout=layoutLabels(ctx,resolvedLabels,innerWidth,labelFont,gap);
          ctx.font=labelFont+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          for(const chip of finalLayout.chips){
            roundedRect(ctx,cardX+pad+chip.x,cursorY+chip.y,chip.width,chipHeight,chipHeight/2);
            ctx.fillStyle='#f6f5f1';ctx.fill();ctx.strokeStyle='#e7e6df';ctx.lineWidth=1;ctx.stroke();
            ctx.fillStyle='#66675f';ctx.textBaseline='middle';
            ctx.fillText(chip.text,cardX+pad+chip.x+14,cursorY+chip.y+chipHeight/2);
          }
        }
      }else if(resolvedLabels.length){
        const labelFont=Math.round(width*.021),chipHeight=labelFont+22,gap=Math.round(width*.012);
        const labelsLayout=layoutLabels(ctx,resolvedLabels,innerWidth,labelFont,gap);
        cursorY+=Math.round(width*.035);
        ctx.font=labelFont+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        for(const chip of labelsLayout.chips){
          roundedRect(ctx,cardX+pad+chip.x,cursorY+chip.y,chip.width,chipHeight,chipHeight/2);
          ctx.fillStyle='#f6f5f1';ctx.fill();ctx.strokeStyle='#e7e6df';ctx.lineWidth=1;ctx.stroke();
          ctx.fillStyle='#66675f';ctx.textBaseline='middle';
          ctx.fillText(chip.text,cardX+pad+chip.x+14,cursorY+chip.y+chipHeight/2);
        }
      }else{
        ctx.font='400 '+Math.round(width*.024)+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle='#777870';ctx.fillText('Uma ideia para refletir.',cardX+pad,cursorY);
      }
      const brandSize=Math.max(14,Math.round(width*.014));
      ctx.strokeStyle='#ecebe5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cardX+pad,cardY+cardH-pad-18);ctx.lineTo(cardX+cardW-pad,cardY+cardH-pad-18);ctx.stroke();
      ctx.font=brandSize+'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle='rgba(0,0,0,.38)';ctx.textAlign='right';ctx.textBaseline='bottom';
      ctx.fillText('risegoat.com',cardX+cardW-pad,cardY+cardH-pad);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob){setError('Não foi possível gerar o PNG. Tente novamente.');return}
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='risegoat-card-'+ratio+'-'+mode+'-'+new Date().toISOString().slice(0,10)+'.png';
      document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{setError('Não foi possível exportar a imagem. Tente novamente.')}
    finally{setBusy(false)}
  }
  return <div className="png-export-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
    <section className="png-export-dialog" role="dialog" aria-modal="true" aria-labelledby="png-export-title">
      <header className="png-export-header"><div className="png-export-icon"><Image size={18}/></div><div><span>RISEGOAT · EXPORTAÇÃO</span><h2 id="png-export-title">Prepare um card para redes</h2><p>Escolha o formato e o nível de detalhe antes de salvar a imagem.</p></div><button className="png-export-close" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={17}/></button></header>
      <label className="png-export-label">Onde vai postar?
        <select value={ratio} onChange={e=>setRatio(e.target.value as RatioKey)}>
          {Object.entries(RATIOS).map(([key,value])=><option key={key} value={key}>{value.label} · {value.destination}</option>)}
        </select>
      </label>
      <fieldset className="png-export-fieldset"><legend>Visibilidade do card</legend>
        <label className={mode==='private'?'selected':''}><input type="radio" name="png-mode" checked={mode==='private'} onChange={()=>setMode('private')}/><span><strong>Card privado</strong><small>Conteúdo completo e etiquetas. Use apenas se quiser divulgar toda a nota.</small></span></label>
        <label className={mode==='public-summary'?'selected':''}><input type="radio" name="png-mode" checked={mode==='public-summary'} onChange={()=>setMode('public-summary')}/><span><strong>Card público · resumo</strong><small>Título, uma linha de texto e etiquetas. O restante da nota não entra na imagem.</small></span></label>
        <label className={mode==='public-labels'?'selected':''}><input type="radio" name="png-mode" checked={mode==='public-labels'} onChange={()=>setMode('public-labels')}/><span><strong>Card público · só etiquetas</strong><small>Título e etiquetas, sem o texto da nota.</small></span></label>
      </fieldset>
      <div className="png-export-warning"><ShieldCheck size={16}/><p>A imagem é gerada no seu navegador e salva no dispositivo. Nada é publicado pela RiseGoat automaticamente. O domínio aparece discretamente no rodapé.</p></div>
      {error&&<p className="png-export-error" role="alert">{error}</p>}
      <footer className="png-export-footer"><button className="png-export-secondary" onClick={onClose} disabled={busy}>Cancelar</button><button className="png-export-primary" onClick={()=>void exportPng()} disabled={busy}>{busy?<Loader2 size={15} className="png-export-spin"/>:<Download size={15}/>} {busy?'Gerando PNG…':'Salvar PNG'}</button></footer>
    </section>
  </div>;
}

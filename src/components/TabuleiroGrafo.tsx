import { useMemo } from 'react';
import { ZoomIn } from 'lucide-react';
import type { Magnate, MagnateConnection } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

type Props={nodes:Magnate[];edges:MagnateConnection[];onOpen:(slug:string)=>void};
type Point={node:Magnate;x:number;y:number};

export function layoutTabuleiroGraph(nodes:Magnate[]):Point[]{
  const unique=[...new Map(nodes.map(node=>[node.id,node])).values()];
  const bySector=new Map<string,Magnate[]>();
  unique.forEach(node=>{const group=bySector.get(node.setor)||[];group.push(node);bySector.set(node.setor,group)});
  const sectors=[...bySector.keys()].sort();
  const points:Point[]=[];
  sectors.forEach((sector,sectorIndex)=>{
    const group=(bySector.get(sector)||[]).slice().sort((a,b)=>a.nome.localeCompare(b.nome));
    const sectorAngle=(sectorIndex/Math.max(1,sectors.length))*Math.PI*2-Math.PI/2;
    group.forEach((node,index)=>{
      const radius=70+Math.min(290,26*Math.sqrt(index+1));
      const angle=sectorAngle+(index*2.399963229728653);
      const x=Math.max(32,Math.min(1368,700+Math.cos(angle)*radius));
      const y=Math.max(32,Math.min(868,450+Math.sin(angle)*radius));
      points.push({node,x,y});
    });
  });
  return points;
}

export function TabuleiroGrafo({nodes,edges,onOpen}:Props){
  const points=useMemo(()=>layoutTabuleiroGraph(nodes),[nodes]);
  const byId=useMemo(()=>new Map(points.map(point=>[point.node.id,point])),[points]);
  const visibleEdges=useMemo(()=>edges.filter(edge=>byId.has(edge.origem_id)&&byId.has(edge.destino_id)),[edges,byId]);
  if(!points.length)return <div className="tabuleiro-empty"><ZoomIn size={24}/><strong>O grafo está vazio</strong><p>Quando os primeiros perfis e conexões verificadas forem adicionados, eles aparecerão aqui.</p></div>;
  return <section className="tabuleiro-graph-panel">
    <div className="tabuleiro-graph-meta"><span>{points.length} perfis</span><span>{visibleEdges.length} conexões</span><span>Os nós agrupam perfis por setor.</span></div>
    <div className="tabuleiro-graph-scroll">
      <svg className="tabuleiro-graph-svg" viewBox="0 0 1400 900" role="img" aria-label="Grafo de relações públicas entre perfis do Tabuleiro">
        <g className="tabuleiro-graph-edges">{visibleEdges.map(edge=>{const a=byId.get(edge.origem_id),b=byId.get(edge.destino_id);if(!a||!b)return null;return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={Math.max(1,Math.min(3,(edge.forca||1)/3))}><title>{edge.tipo}{edge.fonte?' · Fonte: '+edge.fonte:''}</title></line>})}</g>
        <g className="tabuleiro-graph-nodes">{points.map(point=><g key={point.node.id} className="tabuleiro-graph-node" transform={'translate('+point.x+' '+point.y+')'} role="button" tabIndex={0} aria-label={'Abrir '+point.node.nome} onClick={()=>onOpen(point.node.slug)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onOpen(point.node.slug)}}}><circle r="8"/><text x="12" y="4">{point.node.nome.length>22?point.node.nome.slice(0,21)+'…':point.node.nome}</text><title>{point.node.nome+' · '+point.node.setor}</title></g>)}</g>
      </svg>
    </div>
  </section>;
}

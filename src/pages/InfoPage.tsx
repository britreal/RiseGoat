import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import '@/lib/info-pages.css';

export type InfoPageKind='terms'|'privacy'|'about';
type Section={title:string;paragraphs:string[];items?:string[]};
type PageCopy={kicker:string;title:string;lead:string;icon:'lock'|'shield'|'people';sections:Section[]};

const pages:Record<InfoPageKind,PageCopy>={
  terms:{
    kicker:'TERMOS DE USO',
    title:'Confiança exige limites claros.',
    lead:'A RiseGoat reúne notas pessoais e ferramentas opcionais de colaboração. A entrada na rede é curada, a visibilidade pública é explícita e o conteúdo compartilhado deve ter um propósito definido.',
    icon:'shield',
    sections:[
      {title:'Acesso e elegibilidade',paragraphs:['O acesso à rede ocorre por solicitação e aprovação manual ou por convite válido. Um código de indicação registra a origem da solicitação, mas não garante admissão.','Cada membro é responsável por manter seu e-mail seguro, revisar convites e proteger os links de acesso recebidos.']},
      {title:'Notas pessoais e colaboração',paragraphs:['Notas, pastas e conexões pessoais são privadas por padrão. Ao convidar alguém para uma nota, o proprietário escolhe a permissão de edição ou somente leitura.','Notas de círculos e contribuições das salas existem em espaços próprios. Não se deve copiar nem compartilhar conteúdo pessoal sem consentimento expresso.']},
      {title:'Tabuleiro e fontes',paragraphs:['O Tabuleiro exibe apenas registros marcados como públicos após curadoria. Informações de patrimônio, relações empresariais e biografias podem ser estimativas ou sofrer alterações. Não constituem aconselhamento financeiro, jurídico ou de investimento.','Os registros devem incluir fontes rastreáveis. A presença de uma sugestão encontrada por uma API não comprova vínculo, controle, doação ou relação entre pessoas.']},
      {title:'Conduta e confidencialidade',items:['Respeite as permissões escolhidas pelo autor e os acordos de confidencialidade do círculo.','Não publique dados pessoais ou conteúdo de terceiros sem base apropriada e consentimento.','Não tente contornar controles de acesso, extrair conteúdo privado ou abusar das funções de convite.','Avise o curador quando encontrar uma informação pública incorreta ou desatualizada.']},
      {title:'Limites e disponibilidade',paragraphs:['O produto pode passar por manutenção e mudanças. Recursos experimentais podem ser ativados ou desativados por configuração. A RiseGoat não garante que toda fonte externa esteja sempre disponível ou atualizada.']}
    ]
  },
  privacy:{
    kicker:'POLÍTICA DE PRIVACIDADE',
    title:'Privado por padrão. Compartilhado por escolha.',
    lead:'Esta página explica quais dados estruturais são usados para operar a RiseGoat e como o acesso ao conteúdo pessoal é separado das métricas administrativas da rede.',
    icon:'lock',
    sections:[
      {title:'O que armazenamos',paragraphs:['A conta e o perfil de membro podem incluir e-mail de autenticação, nome, cidade, setor, foco atual, preferências de visibilidade e preferências de contato. Informações do perfil só aparecem no diretório quando o membro ativa a visibilidade.','Notas, checklists, arquivos, pastas, etiquetas e conexões pessoais são armazenados para permitir sincronização e uso entre sessões. Anexos pessoais usam um bucket privado.']},
      {title:'Compartilhamento escolhido pelo membro',paragraphs:['Convites de notas incluem o e-mail convidado e o papel autorizado. Círculos e salas mantêm registros em tabelas separadas; o acesso a notas de círculo exige adesão aceita.','O Tabuleiro mostra detalhes públicos apenas quando um registro está marcado como público. Dados de círculo não são copiados para perfis do Tabuleiro.']},
      {title:'Metadados e auditoria',paragraphs:['Para segurança e operação, o sistema pode registrar eventos estruturais como abertura de painel administrativo, alteração de status de convite, criação/organização de notas e visualizações de perfis do Tabuleiro.','O painel administrativo de rede apresenta metadados, contagens e relações estruturais. Ele não foi projetado para exibir o texto das notas pessoais. A atividade coletiva de checklist é opcional e os resumos de círculo só aparecem acima de um limite mínimo de participantes com opt-in.']},
      {title:'Fontes externas e curadoria',paragraphs:['Fontes do Tabuleiro podem vir de páginas públicas, bases de dados e registros oficiais. Correspondências aproximadas devem permanecer como sugestões até revisão. Não se deve registrar uma relação como fato sem fonte que a sustente.']},
      {title:'Retenção e controles',paragraphs:['Notas movidas para a lixeira seguem a política de retenção configurada no aplicativo. Convites têm prazo de validade e podem ser revogados.','A exclusão completa da conta e o processo de remoção de dados ainda precisam ser confirmados como disponíveis na interface de produção antes de esta política poder prometer autoexclusão. Até essa implementação ser publicada, a exclusão não deve ser anunciada como recurso disponível.']},
      {title:'Boas práticas',items:['Use visibilidade opt-in somente quando desejar aparecer no diretório.','Não inclua senhas, chaves privadas, dados completos de documentos ou informações desnecessárias nas notas.','Revise a permissão antes de enviar um convite. Revogar acesso não apaga cópias feitas fora do aplicativo.','Confira qualquer card PNG antes de publicar: a imagem é salva localmente, mas pode conter o texto escolhido no exportador.']}
    ]
  },
  about:{
    kicker:'SOBRE A RISEGOAT',
    title:'Uma rede construída com intenção.',
    lead:'A RiseGoat combina um espaço pessoal para pensar com ferramentas de contexto compartilhado. A proposta é favorecer relações úteis, pequenas e baseadas em consentimento, em vez de uma rede aberta e barulhenta.',
    icon:'people',
    sections:[
      {title:'Curadoria, não volume',paragraphs:['A entrada na rede é analisada manualmente. Uma indicação ajuda a contextualizar a solicitação; não compra nem garante acesso. O responsável pela curadoria procura entender o que a pessoa está construindo, o que procura e como pode contribuir.']},
      {title:'Privacidade como produto',paragraphs:['A rede não precisa ler notas privadas para entender sua estrutura. Conexões são representadas por relações explícitas, como participação aceita em círculos e conexões de empresas com fonte. Métricas administrativas priorizam metadados, não conteúdo.']},
      {title:'Pequenos grupos, contexto duradouro',paragraphs:['Círculos fechados e salas temáticas criam espaços onde contexto e decisões podem ser mantidos ao longo do tempo. Apresentações a outros membros devem ser consentidas por todas as partes.']},
      {title:'Fontes e rigor',paragraphs:['O Tabuleiro é uma ferramenta de pesquisa e organização. Fontes, datas e estados de revisão devem acompanhar os registros. Não é um ranking de valor humano, prova de influência nem substituto de due diligence.']}
    ]
  }
};

export function InfoPage({page}:{page:InfoPageKind}){
  const copy=pages[page];
  const Icon=copy.icon==='lock'?LockKeyhole:copy.icon==='shield'?ShieldCheck:Users;
  function go(path:string){window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'))}
  return <main className="info-page-shell">
    <header className="info-page-header"><a href="/" className="info-page-brand" onClick={e=>{e.preventDefault();go('/')}}><span>R</span><strong>RiseGoat</strong></a><button onClick={()=>go('/')}><ArrowLeft size={14}/>Início</button></header>
    <article className="info-page-document">
      <div className="info-page-hero"><div className="info-page-icon"><Icon size={21}/></div><span className="info-page-kicker">{copy.kicker}</span><h1>{copy.title}</h1><p>{copy.lead}</p><small>Atualizado em 10 de outubro de 2026</small></div>
      {copy.sections.map(section=><section className="info-page-section" key={section.title}><h2>{section.title}</h2>{section.paragraphs?.map((paragraph,index)=><p key={index}>{paragraph}</p>)}{section.items&&<ul>{section.items.map(item=><li key={item}>{item}</li>)}</ul>}</section>)}
    </article>
    <footer className="info-page-footer"><span>RiseGoat · Sala fechada</span><nav><a href="/termos" onClick={e=>{e.preventDefault();go('/termos')}}>Termos</a><a href="/privacidade" onClick={e=>{e.preventDefault();go('/privacidade')}}>Privacidade</a><a href="/sobre" onClick={e=>{e.preventDefault();go('/sobre')}}>Sobre</a><button onClick={()=>go('/tabuleiro')}>Tabuleiro <ArrowRight size={12}/></button></nav></footer>
  </main>;
}

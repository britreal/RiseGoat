export type FolderTemplateIcon = 'network' | 'key-round' | 'book-open' | 'users' | 'target' | 'briefcase';
export type FolderTemplateNote = {
  key: string;
  title: string;
  type: 'text' | 'checklist';
  tags: string[];
  sections?: { heading: string; paragraphs?: string[]; items?: string[] }[];
  checklistItems?: string[];
};
export type FolderTemplate = {
  id: 'teia' | 'acesso' | 'escritor' | 'circulo' | 'decisao' | 'ativo';
  name: string;
  color: string;
  icon: FolderTemplateIcon;
  description: string;
  purpose: string;
  notes: FolderTemplateNote[];
  connections: { from: string; to: string }[];
};

export const folderTemplates: FolderTemplate[] = [
  {
    id: 'teia',
    name: '🕸️ TEIA',
    color: '#6C63FF',
    icon: 'network',
    description: 'Contatos, reciprocidade, negociação e relações entre pessoas e projetos.',
    purpose: 'Construa um registro de relações que ajude a lembrar compromissos, contexto e oportunidades de colaboração.',
    notes: [
      {
        key: 'contacts',
        title: 'Meus Contatos Estratégicos',
        type: 'text',
        tags: ['teia', 'contatos'],
        sections: [
          { heading: 'TIER A · Aliados Poderosos', items: ['Nome:', 'Ocupação:', 'Valor estratégico:', 'Última interação:', 'Próxima ação:'] },
          { heading: 'TIER B · Conexões Promissoras', items: ['Nome:', 'Ocupação:', 'Valor estratégico:', 'Última interação:', 'Próxima ação:'] },
          { heading: 'TIER C · Conhecidos', items: ['Nome:', 'Ocupação:', 'Valor estratégico:', 'Última interação:', 'Próxima ação:'] },
        ],
      },
      {
        key: 'ledger',
        title: 'Ledger de Reciprocidade',
        type: 'text',
        tags: ['teia', 'reciprocidade'],
        sections: [
          { heading: 'Registro por contato', items: ['Contato:', 'Favor dado:', 'Favor recebido:', 'Saldo:', 'Data:', 'Contexto:'] },
          { heading: 'Regras de uso', items: ['Saldo positivo: eles me devem.', 'Saldo negativo: eu devo a eles.', 'Nunca peça favor grande para quem tem saldo negativo.', 'Cobre favores pequenos rapidamente.'] },
        ],
      },
      {
        key: 'negotiation',
        title: 'Dossiê de Negociação',
        type: 'text',
        tags: ['teia', 'negociacao'],
        sections: [
          { heading: 'Informações básicas · [Nome do contato]', items: ['Ocupação:', 'Empresa:', 'Interesses:', 'Dores:'] },
          { heading: 'Estilo de negociação', items: ['Estilo observado: agressivo, conciliador ou analítico.', 'O que a pessoa não aceita:', 'O que ajuda a chegar a um acordo:', 'Alternativas de cada lado se não houver acordo:'] },
          { heading: 'Histórico', items: ['Negociações anteriores:', 'Resultados:', 'Lições:'] },
          { heading: 'Estratégia', items: ['Como abordar:', 'O que oferecer:', 'O que pedir:', 'Próximo passo:'] },
        ],
      },
      {
        key: 'influence',
        title: 'Mapa de Influência',
        type: 'text',
        tags: ['teia', 'influencia'],
        sections: [
          { heading: 'Relações observadas', items: ['Influenciador:', 'Pessoa ou grupo influenciado:', 'Intensidade (1 a 10):', 'Tema:', 'Fonte ou evidência da relação:'] },
          { heading: 'Análise', items: ['Quem são os nós centrais?', 'Quem faz a ponte entre grupos?', 'Quais conexões ainda precisam ser verificadas?', 'Onde eu me encaixo nessa rede?'] },
        ],
      },
      {
        key: 'weekly-followups',
        title: 'Follow-ups da Semana',
        type: 'checklist',
        tags: ['teia', 'follow-up'],
        checklistItems: ['Revisar contatos TIER A', 'Revisar contatos TIER B', 'Enviar 3 mensagens de valor', 'Registrar interações no Ledger', 'Atualizar Mapa de Influência'],
      },
      {
        key: 'weekly-review',
        title: 'Revisão Semanal da Teia',
        type: 'checklist',
        tags: ['teia', 'revisao'],
        checklistItems: ['Atualizar CRM de contatos', 'Verificar quem não interage há 30 dias', 'Identificar novas oportunidades de conexão', 'Planejar próximas ações'],
      },
    ],
    connections: [
      { from: 'contacts', to: 'ledger' },
      { from: 'contacts', to: 'negotiation' },
      { from: 'influence', to: 'contacts' },
    ],
  },
  {
    id: 'acesso',
    name: '🔓 ACESSO',
    color: '#00F5D4',
    icon: 'key-round',
    description: 'Networking intencional, aproximação respeitosa e contribuições de valor.',
    purpose: 'Organize o caminho entre conhecer alguém, iniciar uma conversa genuína e construir colaboração mútua.',
    notes: [
      {
        key: 'targets',
        title: 'Lista de Alvos',
        type: 'text',
        tags: ['acesso', 'alvos'],
        sections: [
          { heading: 'TIER A · Pessoas que admiro', items: ['Nome:', 'Ocupação:', 'Por que admiro:', 'O que posso oferecer:', 'Status:'] },
          { heading: 'TIER B · Pessoas com valor mútuo', items: ['Nome:', 'O que podem oferecer:', 'O que posso oferecer:', 'Interesses em comum:', 'Status:'] },
          { heading: 'TIER C · Conexões para cultivar', items: ['Nome:', 'Interesses em comum:', 'Próxima ação:', 'Status:'] },
        ],
      },
      {
        key: 'approach',
        title: 'Aproximação em 5 Passos',
        type: 'text',
        tags: ['acesso', 'metodo'],
        sections: [
          { heading: 'Passo 1 · Observar', items: ['Conhecer o trabalho e os conteúdos públicos da pessoa.', 'Identificar interesses declarados e pontos de conexão.', 'Anotar uma pergunta específica e respeitosa.'] },
          { heading: 'Passo 2 · Contatar', items: ['Enviar uma mensagem com admiração específica.', 'Pedir esclarecimento sobre uma ideia que a pessoa compartilhou.', 'Não começar a conversa pedindo um favor.'] },
          { heading: 'Passo 3 · Rapport', items: ['Aprofundar a conversa sem forçar intimidade.', 'Fazer perguntas abertas.', 'Demonstrar interesse genuíno.', 'Registrar insights relevantes e apropriados.'] },
          { heading: 'Passo 4 · Presente', items: ['Oferecer algo útil sem criar obrigação.', 'Exemplos: resumo de livro citado, ferramenta, conexão consentida ou feedback solicitado.', 'Entregar com leveza e respeitar a resposta.'] },
          { heading: 'Passo 5 · Convite', items: ['Quando houver confiança mútua, propor uma troca clara de ideias e conexões.', 'Explicar o propósito de um grupo ou conversa.', 'Convidar sem pressão e aceitar um não.'] },
        ],
      },
      {
        key: 'interests',
        title: 'Dossiê de Interesses e Dores',
        type: 'text',
        tags: ['acesso', 'dossie'],
        sections: [
          { heading: '[Nome da pessoa]', items: ['Objetivo declarado:', 'Objetivo não declarado (hipótese, não fato):', 'Risco que procura evitar:', 'Preocupação profissional que já compartilhou:', 'O que já tentou e não funcionou:', 'Aliados e colaboradores conhecidos:', 'Conflitos ou relações profissionais relevantes:', 'Pontos de conexão comigo:', 'Próximo passo respeitoso:'] },
          { heading: 'Nota de responsabilidade', items: ['Diferencie informação confirmada de hipótese. Não trate suposições sobre objetivos ou medos como fatos.', 'Use apenas informações públicas ou compartilhadas de forma apropriada.', 'Não investigue nem registre segredos, dados sensíveis ou informações obtidas sem consentimento.', 'Revise e remova dados desnecessários ou desatualizados.'] },
        ],
      },
      {
        key: 'gifts',
        title: 'Presentes Estratégicos',
        type: 'text',
        tags: ['acesso', 'presentes'],
        sections: [
          { heading: 'Registro por contato', items: ['Contato:', 'Interesse compartilhado:', 'Presente ou contribuição útil:', 'Status:', 'Data:', 'Reação ou retorno:'] },
          { heading: 'Tipos de contribuição', items: ['Resumo de livro que a pessoa citou.', 'Ferramenta que resolve uma necessidade conhecida.', 'Introdução entre pessoas que consentiram em ser apresentadas.', 'Análise ou feedback solicitado sobre um trabalho.', 'Conteúdo útil que a pessoa escolheu receber.'] },
          { heading: 'Princípios', items: ['Não cobrar nada em troca.', 'Entregar sem pressão.', 'Registrar a reação de forma respeitosa.', 'Não esperar retorno imediato.'] },
        ],
      },
      {
        key: 'weekly-actions',
        title: 'Ações da Semana · Acesso',
        type: 'checklist',
        tags: ['acesso', 'acao'],
        checklistItems: ['Estudar 2 contatos usando informações públicas e relevantes', 'Enviar 1 mensagem de admiração específica', 'Aprofundar 1 conversa com interesse genuíno', 'Preparar 1 contribuição útil', 'Registrar o acompanhamento no CRM'],
      },
      {
        key: 'inner-circle',
        title: 'Construção de Círculo Íntimo',
        type: 'checklist',
        tags: ['acesso', 'comunidade'],
        checklistItems: ['Identificar 5 pessoas com interesses compartilhados', 'Definir um propósito claro para o grupo', 'Criar um grupo no Telegram se fizer sentido para todos', 'Convidar 3 pessoas sem pressão', 'Compartilhar conteúdo útil e autorizado', 'Manter a privacidade e respeitar os limites de cada participante'],
      },
    ],
    connections: [
      { from: 'targets', to: 'interests' },
      { from: 'interests', to: 'gifts' },
      { from: 'approach', to: 'targets' },
    ],
  },
  {
    id: 'escritor',
    name: '📚 ESCRITOR',
    color: '#1E3A5F',
    icon: 'book-open',
    description: 'Do conceito inicial à estrutura, escrita, revisão e publicação de livros ou e-books.',
    purpose: 'Guarde a visão do livro, acompanhe o manuscrito e transforme a escrita em um processo sustentável.',
    notes: [
      {
        key: 'concept',
        title: 'Conceito do Livro',
        type: 'text',
        tags: ['escritor', 'conceito'],
        sections: [
          { heading: 'Informações básicas', items: ['Título provisório:', 'Subtítulo:', 'Gênero:', 'Público-alvo:', 'Promessa central:', 'Tom de voz:', 'Extensão estimada em palavras:'] },
          { heading: 'Fundamento', items: ['Por que este livro?', 'O que o leitor vai ganhar?', 'O que me qualifica ou me motiva a escrever?'] },
        ],
      },
      {
        key: 'structure',
        title: 'Estrutura',
        type: 'text',
        tags: ['escritor', 'estrutura'],
        sections: [
          { heading: 'Introdução', items: ['Qual problema, pergunta ou promessa abre o livro?', 'O que o leitor precisa saber antes do capítulo 1?'] },
          { heading: 'Capítulos', items: ['Capítulo 1 · Título:', 'Resumo:', 'Palavras estimadas:', 'Capítulo 2 · Título:', 'Resumo:', 'Palavras estimadas:', 'Capítulo 3 · Título:', 'Resumo:', 'Palavras estimadas:'] },
          { heading: 'Conclusão e autor', items: ['Conclusão:', 'Sobre o autor:', 'Referências e fontes a revisar:'] },
        ],
      },
      {
        key: 'writing-editor',
        title: 'Editor de Escrita · Capítulo',
        type: 'text',
        tags: ['escritor', 'capitulo'],
        sections: [
          { heading: 'Capítulo [N]', items: ['Título:', 'Conteúdo: escreva aqui.', 'Notas e referências:', 'Status: rascunho, revisão ou finalizado.'] },
          { heading: 'Próxima revisão', items: ['O argumento principal está claro?', 'Cada seção contribui para o objetivo do capítulo?', 'Quais fontes ou exemplos ainda faltam?'] },
        ],
      },
      {
        key: 'metadata',
        title: 'Metadados do Livro',
        type: 'text',
        tags: ['escritor', 'metadados'],
        sections: [
          { heading: 'Ficha de publicação', items: ['Descrição (blurb):', 'Palavras-chave (até 7):', 'Categoria principal:', 'Categorias adicionais:', 'ISBN, se aplicável:', 'Preço planejado:', 'Direitos e licença:', 'Arquivo da capa:', 'Dimensões da capa a confirmar com a plataforma de publicação:'] },
          { heading: 'Conferência', items: ['Confirmar as exigências atuais da plataforma.', 'Verificar direitos de texto, imagem e fontes.', 'Revisar descrição, autoria e preço antes de publicar.'] },
        ],
      },
      {
        key: 'daily-writing',
        title: 'Escrita Diária',
        type: 'checklist',
        tags: ['escritor', 'rotina'],
        checklistItems: ['Escrever 500 palavras ou uma meta realista', 'Revisar o que foi escrito ontem', 'Atualizar a contagem de palavras', 'Registrar o progresso do projeto'],
      },
      {
        key: 'revision',
        title: 'Revisão',
        type: 'checklist',
        tags: ['escritor', 'revisao'],
        checklistItems: ['Revisar gramática', 'Revisar coesão', 'Revisar clareza', 'Ler em voz alta', 'Marcar o capítulo como finalizado quando estiver pronto'],
      },
      {
        key: 'publication',
        title: 'Publicação',
        type: 'checklist',
        tags: ['escritor', 'publicacao'],
        checklistItems: ['Preparar EPUB', 'Preparar PDF se necessário', 'Criar e revisar a capa', 'Conferir metadados', 'Confirmar exigências atuais da Amazon KDP', 'Escolher canais de venda, como Gumroad, se fizer sentido', 'Planejar a divulgação nas redes'],
      },
    ],
    connections: [
      { from: 'concept', to: 'structure' },
      { from: 'structure', to: 'writing-editor' },
      { from: 'writing-editor', to: 'metadata' },
      { from: 'metadata', to: 'publication' },
    ],
  },

  {
    id: 'circulo',
    name: '⭕ CÍRCULO',
    color: '#2563EB',
    icon: 'users',
    description: 'Grupo pequeno, confiança mútua e contribuições com contexto.',
    purpose: 'Organize um círculo privado de 3 a 12 pessoas. A pasta é pessoal; use os recursos da Rede para o trabalho que será compartilhado de fato.',
    notes: [
      {
        key: 'circle-charter',
        title: 'Acordos do Círculo',
        type: 'text',
        tags: ['circulo', 'acordos'],
        sections: [
          { heading: 'Propósito', items: ['Por que este círculo existe:', 'Que tipo de ajuda e contribuição faz sentido:', 'O que fica dentro do grupo:', 'Como lidar com discordâncias:'] },
          { heading: 'Limites e confiança', items: ['Não repassar notas do grupo sem consentimento.', 'Separar fatos, hipóteses e opiniões.', 'Respeitar um não e a confidencialidade acordada.', 'Revisar periodicamente quem realmente precisa participar.'] },
        ],
      },
      {
        key: 'circle-roster',
        title: 'Cartões dos Membros',
        type: 'text',
        tags: ['circulo', 'membros'],
        sections: [
          { heading: '[Nome do membro]', items: ['Nome e contexto profissional:', 'Cidade / setor:', 'Foco atual declarado:', 'Temas em que aceita conversar:', 'O que oferece ao círculo:', 'O que gostaria de encontrar:', 'Próxima contribuição combinada:'] },
          { heading: 'Privacidade', items: ['Registre apenas informações fornecidas para este propósito.', 'Não transforme impressões em fatos.', 'Remova dados desnecessários ou desatualizados.'] },
        ],
      },
      {
        key: 'circle-contributions',
        title: 'Contribuições da Semana',
        type: 'checklist',
        tags: ['circulo', 'contribuicoes'],
        checklistItems: ['Definir a principal pergunta do encontro', 'Cada membro registrar uma contribuição útil', 'Identificar apresentações consentidas', 'Registrar decisões e responsáveis', 'Confirmar próximos passos'],
      },
      {
        key: 'circle-decisions',
        title: 'Decisões e Próximos Passos',
        type: 'text',
        tags: ['circulo', 'decisoes'],
        sections: [
          { heading: '[Data · decisão]', items: ['Contexto compartilhado:', 'Alternativas consideradas:', 'Decisão e justificativa:', 'Responsável:', 'Prazo:', 'Como saberemos que funcionou:', 'Data de revisão:'] },
        ],
      },
      {
        key: 'circle-review',
        title: 'Ritual Semanal',
        type: 'checklist',
        tags: ['circulo', 'ritual'],
        checklistItems: ['Revisar os compromissos abertos', 'Identificar quem precisa de uma introdução', 'Compartilhar uma lição prática', 'Atualizar decisões que mudaram', 'Agendar o próximo encontro'],
      },
    ],
    connections: [
      { from: 'circle-charter', to: 'circle-roster' },
      { from: 'circle-roster', to: 'circle-contributions' },
      { from: 'circle-contributions', to: 'circle-decisions' },
      { from: 'circle-decisions', to: 'circle-review' },
    ],
  },
  {
    id: 'decisao',
    name: '🎯 DECISÃO',
    color: '#7C3AED',
    icon: 'target',
    description: 'Transforme decisões difíceis em critérios claros e ações verificáveis.',
    purpose: 'Uma estrutura para decisões importantes, com alternativas, riscos, responsável e revisão posterior.',
    notes: [
      {
        key: 'decision-brief',
        title: 'Memorando de Decisão',
        type: 'text',
        tags: ['decisao', 'criterios'],
        sections: [
          { heading: 'Definição', items: ['Decisão a tomar:', 'Por que agora:', 'Objetivo desejado:', 'Restrições reais:', 'Prazo para decidir:', 'Responsável final:'] },
          { heading: 'Critérios', items: ['O que precisa ser verdade:', 'O que seria inaceitável:', 'Custos de oportunidade:', 'Qual é o custo de não fazer nada:'] },
          { heading: 'Reversibilidade', items: ['Fácil ou difícil de reverter:', 'Qual é o menor experimento seguro:', 'Sinal para parar ou mudar de rota:'] },
        ],
      },
      {
        key: 'decision-options',
        title: 'Alternativas e Riscos',
        type: 'text',
        tags: ['decisao', 'riscos'],
        sections: [
          { heading: 'Opção A', items: ['Benefício esperado:', 'Custo e tempo:', 'Risco principal:', 'Evidência disponível:', 'O que ainda precisamos saber:'] },
          { heading: 'Opção B', items: ['Benefício esperado:', 'Custo e tempo:', 'Risco principal:', 'Evidência disponível:', 'O que ainda precisamos saber:'] },
          { heading: 'Comparação', items: ['Critérios mais importantes:', 'Hipótese que pode estar errada:', 'Consequência de cada alternativa:'] },
        ],
      },
      {
        key: 'decision-execution',
        title: 'Execução da Decisão',
        type: 'checklist',
        tags: ['decisao', 'execucao'],
        checklistItems: ['Registrar a decisão e o motivo', 'Definir responsável e prazo', 'Comunicar quem precisa saber', 'Executar o primeiro passo reversível', 'Marcar a data de revisão', 'Documentar o resultado'],
      },
      {
        key: 'decision-postmortem',
        title: 'Revisão Pós-Decisão',
        type: 'text',
        tags: ['decisao', 'revisao'],
        sections: [
          { heading: 'Resultado', items: ['O que esperávamos:', 'O que aconteceu:', 'Quais premissas se confirmaram:', 'O que nos surpreendeu:', 'O que faríamos de outro modo:', 'Lição reutilizável:'] },
        ],
      },
    ],
    connections: [
      { from: 'decision-brief', to: 'decision-options' },
      { from: 'decision-options', to: 'decision-execution' },
      { from: 'decision-execution', to: 'decision-postmortem' },
    ],
  },
  {
    id: 'ativo',
    name: '💼 ATIVO',
    color: '#047857',
    icon: 'briefcase',
    description: 'Inventário de ativos, liquidez, riscos e alavancas disponíveis.',
    purpose: 'Mantenha um inventário pessoal de ativos e recursos com dados que você escolhe registrar, sem inferências automáticas ou exposição para outros membros.',
    notes: [
      {
        key: 'asset-inventory',
        title: 'Inventário de Ativos',
        type: 'text',
        tags: ['ativo', 'inventario'],
        sections: [
          { heading: '[Nome do ativo]', items: ['Categoria:', 'Proprietário / responsável:', 'Valor estimado e data da estimativa:', 'Liquidez e prazo para acesso:', 'Receita ou benefício recorrente:', 'Custos recorrentes:', 'Risco principal:', 'Documento de referência guardado em local seguro:', 'Próxima revisão:'] },
          { heading: 'Cuidados', items: ['Diferenciar estimativa de valor confirmado.', 'Não registrar senhas, chaves privadas ou números completos de documentos.', 'Restringir o acesso a dados financeiros sensíveis.', 'Atualizar a data de cada estimativa.'] },
        ],
      },
      {
        key: 'asset-leverage',
        title: 'Alavancas e Oportunidades',
        type: 'text',
        tags: ['ativo', 'alavancas'],
        sections: [
          { heading: 'Recursos disponíveis', items: ['Conhecimento ou competência:', 'Tempo disponível:', 'Rede de relações com consentimento:', 'Capital que pode ser alocado:', 'Ferramentas e infraestrutura:', 'Parcerias em avaliação:'] },
          { heading: 'Possível alavanca', items: ['Qual resultado ela pode ampliar:', 'Esforço inicial:', 'Dependências:', 'Risco de concentração:', 'Experimento de baixo risco:', 'Critério de continuidade:'] },
        ],
      },
      {
        key: 'asset-review',
        title: 'Revisão de Portfólio',
        type: 'checklist',
        tags: ['ativo', 'revisao'],
        checklistItems: ['Atualizar valores e datas de referência', 'Revisar liquidez e compromissos próximos', 'Conferir custos recorrentes', 'Reavaliar riscos e concentração', 'Definir uma ação para cada ativo relevante', 'Arquivar dados que não são mais necessários'],
      },
    ],
    connections: [
      { from: 'asset-inventory', to: 'asset-leverage' },
      { from: 'asset-leverage', to: 'asset-review' },
    ],
  },
];

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function templateNoteContent(note: FolderTemplateNote): string {
  return (note.sections ?? []).map(section => {
    const heading = '<p><strong>' + escapeHtml(section.heading) + '</strong></p>';
    const paragraphs = (section.paragraphs ?? []).map(paragraph => '<p>' + escapeHtml(paragraph) + '</p>').join('');
    const items = (section.items ?? []).length
      ? '<ul>' + section.items!.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>'
      : '';
    return heading + paragraphs + items;
  }).join('');
}

export type FolderTemplateIcon = 'network' | 'key-round' | 'book-open';
export type FolderTemplateNote = {
  key: string;
  title: string;
  type: 'text' | 'checklist';
  tags: string[];
  sections?: { heading: string; paragraphs?: string[]; items?: string[] }[];
  checklistItems?: string[];
};
export type FolderTemplate = {
  id: 'teia' | 'acesso' | 'escritor';
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
    color: '#00BFA6',
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
          { heading: '[Nome da pessoa]', items: ['Objetivo declarado:', 'Objetivos que a própria pessoa compartilhou:', 'Riscos profissionais que mencionou:', 'Desafios que já tentou resolver:', 'Aliados e colaboradores citados publicamente:', 'Interesses e temas públicos:', 'Pontos de conexão comigo:', 'Uma forma concreta e respeitosa de ajudar:'] },
          { heading: 'Nota de responsabilidade', items: ['Use apenas informações públicas ou compartilhadas de forma apropriada.', 'Não registre segredos, dados sensíveis nem informações obtidas sem consentimento.', 'Revise e remova dados desnecessários ou desatualizados.'] },
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
        checklistItems: ['Identificar 5 pessoas com interesses compartilhados', 'Definir um propósito claro para o grupo', 'Convidar 3 pessoas sem pressão', 'Compartilhar conteúdo útil e autorizado', 'Manter a privacidade e respeitar os limites de cada participante'],
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

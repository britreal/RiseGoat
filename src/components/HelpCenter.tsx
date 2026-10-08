import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Bell, BookOpen, ChevronDown, ChevronRight, CircleHelp, Command, Compass,
  Download, FileText, Folder, History, Map, Network, Search, ShieldCheck,
  Sparkles, X, type LucideIcon,
} from 'lucide-react';
import '@/lib/help-center.css';

type HelpArticle = {
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
  note?: string;
  keywords: string;
};
type HelpCategory = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  articles: HelpArticle[];
};

const helpCategories: HelpCategory[] = [
  {
    id: 'start',
    title: 'Comece aqui',
    description: 'Entenda o essencial e monte um sistema simples que funcione para você.',
    icon: Sparkles,
    articles: [
      {
        title: 'A melhor forma de começar',
        summary: 'Use o Notas como uma memória externa. Primeiro capture a ideia; depois decida onde ela deve ficar.',
        steps: [
          'Clique em Nova nota para abrir uma nota de texto.',
          'Dê um título que ajude você a reconhecer o assunto mais tarde.',
          'Escreva a ideia sem tentar organizar tudo perfeitamente.',
          'Quando fizer sentido, mova para uma pasta, aplique uma etiqueta ou fixe a nota.',
        ],
        tip: 'Crie uma nota para cada assunto ou ideia independente. Fica muito mais fácil encontrar e conectar informações depois.',
        keywords: 'início primeiro passo começar organização captura ideias memória',
      },
      {
        title: 'O que acontece quando você escreve',
        summary: 'O Notas salva seu trabalho conforme você edita, sem exigir que você procure um botão Salvar.',
        steps: [
          'Abra uma nota e comece a escrever.',
          'Observe o estado de salvamento no topo do editor.',
          'Feche a nota quando terminar. Ela continuará disponível na sua lista.',
        ],
        note: 'Uma nota realmente vazia fica como rascunho local e não aparece na lista. Adicione um título ou conteúdo para que ela seja salva.',
        keywords: 'salvar salvamento automático rascunho vazio não salvar',
      },
      {
        title: 'Um fluxo diário que não dá trabalho',
        summary: 'Uma rotina curta ajuda a evitar que as notas se transformem em uma pilha sem contexto.',
        steps: [
          'Durante o dia, capture pensamentos e tarefas sem interromper o que está fazendo.',
          'No começo ou fim do dia, revise as notas recentes.',
          'Transforme ações em checklists e coloque prazos importantes em lembretes.',
          'Uma vez por semana, organize o que merece uma pasta, etiqueta ou lugar no Mapa.',
        ],
        tip: 'Não tente categorizar cada pensamento no instante em que ele aparece. Capturar rápido costuma valer mais do que organizar demais.',
        keywords: 'rotina produtividade revisão semanal sistema pessoal',
      },
    ],
  },
  {
    id: 'create',
    title: 'Criar e registrar',
    description: 'Escolha o formato certo para ideias, tarefas, referências e registros rápidos.',
    icon: FileText,
    articles: [
      {
        title: 'Escolha o formato ideal',
        summary: 'O botão de nova nota permite escolher o tipo de registro antes de começar.',
        steps: [
          'Texto: ideias, explicações, rascunhos, diários e referências.',
          'Checklist: tarefas, compras, etapas de um projeto e listas que você quer marcar como concluídas.',
          'Imagem: referências visuais e fotos. Em celulares compatíveis, o seletor pode oferecer a câmera.',
          'Desenho: esboços e anotações visuais feitas à mão.',
          'Áudio: gravações curtas quando escrever não for conveniente.',
        ],
        note: 'A disponibilidade de câmera, desenho e áudio depende do dispositivo e do navegador. O áudio precisa de permissão para usar o microfone.',
        keywords: 'texto checklist lista imagem foto câmera desenho áudio voz gravar formato tipo',
      },
      {
        title: 'Transforme uma nota em checklist',
        summary: 'Use itens marcáveis quando quiser acompanhar uma sequência de ações.',
        steps: [
          'Crie uma nota do tipo Checklist.',
          'Adicione um item por tarefa, mantendo cada ação curta e específica.',
          'Marque os itens diretamente no cartão ou dentro da nota.',
          'Abra a nota quando precisar continuar editando a lista.',
        ],
        tip: 'Comece cada item com um verbo, como “pesquisar”, “escrever”, “enviar” ou “revisar”. Isso deixa o próximo passo claro.',
        keywords: 'tarefas marcar concluir checklist check caixa item lista',
      },
      {
        title: 'Veja a lista sem abrir a nota',
        summary: 'Os cartões de checklist mostram os itens para que você acompanhe o progresso na tela principal.',
        steps: [
          'Na visualização Todas, localize o cartão da checklist.',
          'Marque ou desmarque um item ali mesmo.',
          'Os primeiros seis itens são exibidos no cartão. Quando houver mais, um indicador mostra quantos ficaram fora da prévia.',
        ],
        tip: 'Use a prévia do cartão para acompanhar tarefas em andamento e abra a nota para organizar listas maiores.',
        keywords: 'cartão card prévia itens interagir marcar checklist',
      },
      {
        title: 'Adicione contexto a uma nota',
        summary: 'Uma nota útil deve ajudar seu eu do futuro a entender por que aquela informação importa.',
        steps: [
          'Escreva um título específico em vez de algo genérico como “Ideias”.',
          'Inclua uma frase sobre a origem ou o motivo da informação.',
          'Registre o próximo passo quando houver uma ação a tomar.',
        ],
        tip: 'Exemplo: em vez de “Vídeo”, prefira “Vídeo sobre hábitos: explicar a regra dos dois minutos” e anote o que precisa pesquisar.',
        keywords: 'contexto título clareza referência ideia projeto próximo passo',
      },
    ],
  },
  {
    id: 'organize',
    title: 'Organizar',
    description: 'Crie estrutura sem deixar a organização mais difícil do que o trabalho.',
    icon: Folder,
    articles: [
      {
        title: 'Use pastas para grandes áreas',
        summary: 'Pastas funcionam bem para separar contextos que você consulta com frequência.',
        steps: [
          'Crie uma pasta na área lateral.',
          'Abra uma nota e use o ícone de pasta para atribuí-la a uma pasta.',
          'Clique no nome da pasta para ver somente as notas daquele espaço.',
          'Renomeie uma pasta pelo menu de opções. Excluir a pasta mantém as notas existentes.',
        ],
        tip: 'Prefira poucas pastas claras, como Pessoal, Estudos e Projetos. Não é preciso criar uma pasta para cada pequena ideia.',
        keywords: 'pasta criar mover atribuir renomear excluir categoria',
      },
      {
        title: 'Use etiquetas para temas que se cruzam',
        summary: 'Uma etiqueta ajuda a reunir notas que podem pertencer a pastas diferentes.',
        steps: [
          'Abra uma nota e entre na área de etiquetas.',
          'Crie uma etiqueta ou escolha uma já existente.',
          'Use nomes consistentes, como “ideia de vídeo”, “ler depois” ou “prioridade”.',
          'Edite ou exclua etiquetas na área de gerenciamento de etiquetas.',
        ],
        tip: 'Pastas respondem “onde guardo isto?”. Etiquetas respondem “a que temas isto pertence?”.',
        keywords: 'etiqueta etiquetas tag marcador rótulo criar editar excluir',
      },
      {
        title: 'Cores, fixação e arquivo',
        summary: 'Use sinais visuais para reconhecer as notas sem precisar reler tudo.',
        steps: [
          'Escolha uma cor para distinguir tipos de informação ou projetos.',
          'Fixe notas que você consulta com frequência para deixá-las em Fixadas.',
          'Arquive notas que não precisam aparecer na lista principal, mas que você deseja manter.',
          'Use a seção Arquivo para restaurar uma nota arquivada.',
        ],
        tip: 'Defina uma lógica simples para as cores. Por exemplo, uma cor para ideias e outra para tarefas. O significado deve ser fácil de lembrar.',
        keywords: 'cor cores paleta fixar fixadas pin arquivar arquivo restaurar',
      },
      {
        title: 'Entenda a Lixeira',
        summary: 'Excluir uma nota não é o mesmo que apagá-la permanentemente.',
        steps: [
          'As notas excluídas vão para a Lixeira.',
          'Abra o menu de ações do cartão para restaurar uma nota.',
          'Use Excluir definitivamente apenas quando tiver certeza de que não precisa mais dela.',
        ],
        note: 'Notas na Lixeira podem ser removidas automaticamente após 30 dias. A exclusão definitiva não pode ser desfeita.',
        keywords: 'lixeira excluir apagar restaurar recuperar permanente 30 dias',
      },
    ],
  },
  {
    id: 'find',
    title: 'Encontrar rápido',
    description: 'Recupere informações com busca, filtros e visualizações.',
    icon: Search,
    articles: [
      {
        title: 'Pesquise antes de recriar',
        summary: 'A busca ajuda a localizar notas pelo título e pelo conteúdo textual disponível.',
        steps: [
          'Use o campo Buscar notas no topo.',
          'Digite uma palavra específica, um nome ou uma frase curta.',
          'A busca também considera texto reconhecido de imagens e transcrições quando esses dados existem na nota.',
          'Limpe a busca para voltar à lista completa do filtro atual.',
        ],
        tip: 'Palavras concretas geralmente funcionam melhor do que perguntas inteiras. Pesquise também por um termo que você lembra ter escrito.',
        keywords: 'buscar busca pesquisar pesquisa título conteúdo texto OCR transcrição localizar',
      },
      {
        title: 'Combine filtros e visualização',
        summary: 'Os filtros reduzem a lista quando você sabe o tipo de informação que procura.',
        steps: [
          'Abra Filtros na área lateral.',
          'Combine tipo da nota, cor, etiqueta e presença de lembrete.',
          'Alterne entre cartões em grade e lista usando os controles no topo.',
          'Na visualização em grade, arraste os cartões para ajustar a ordem quando estiver na lista principal.',
        ],
        tip: 'Use filtros temporariamente para encontrar um grupo de notas. Depois limpe os filtros que não precisa mais.',
        keywords: 'filtro filtros cor tipo lembrete grade lista ordenar arrastar',
      },
      {
        title: 'Atalhos para ganhar tempo',
        summary: 'Dois atalhos ajudam a capturar ideias sem navegar pelos controles.',
        steps: [
          'Ctrl + K no Windows ou Linux e Command + K no Mac colocam o foco na busca.',
          'Ctrl + N ou Command + N abre uma nova nota.',
          'Em dispositivos móveis, use o botão + na barra inferior para criar uma nota.',
        ],
        tip: 'Experimente usar a busca por teclado antes de percorrer pastas manualmente.',
        keywords: 'atalho teclado comando ctrl command cmd k n buscar nova nota',
      },
    ],
  },
  {
    id: 'map',
    title: 'Mapa de ideias',
    description: 'Transforme notas separadas em uma visão visual das relações entre elas.',
    icon: Map,
    articles: [
      {
        title: 'Quando usar o Mapa',
        summary: 'O Mapa é útil quando você quer enxergar como ideias, referências e projetos se conectam.',
        steps: [
          'Abra Mapa na navegação lateral.',
          'Cada cartão representa uma nota. Selecione um cartão para ver seus detalhes.',
          'Dê dois cliques em um cartão para abrir a nota original.',
          'Use os controles de zoom e o minimapa para explorar áreas maiores.',
        ],
        tip: 'Comece com um tema central, por exemplo um projeto. Depois conecte referências, ideias, perguntas e próximas ações relacionadas.',
        keywords: 'mapa mapa de ideias grafo visual conexões nós notas relacionar',
      },
      {
        title: 'Crie e explore conexões',
        summary: 'As conexões são criadas manualmente entre notas e ficam salvas para consultas futuras.',
        steps: [
          'No Mapa, arraste um ponto de conexão de uma nota até outra.',
          'Use Tudo para ver as notas encontradas pelos filtros ou Local para explorar a vizinhança de uma nota selecionada.',
          'No modo Local, ajuste a profundidade para mostrar conexões a um, dois ou três níveis.',
          'Use a busca, a pasta e a etiqueta para reduzir o conjunto exibido.',
        ],
        note: 'As posições dos cartões no Mapa e as conexões são salvas. Excluir uma conexão não exclui as notas relacionadas.',
        keywords: 'conectar conectar notas relação aresta linha local tudo profundidade um dois três',
      },
    ],
  },
  {
    id: 'reminders',
    title: 'Lembretes e colaboração',
    description: 'Dê um próximo passo às notas e compartilhe contexto quando necessário.',
    icon: Bell,
    articles: [
      {
        title: 'Defina um lembrete',
        summary: 'Lembretes ajudam a trazer uma nota de volta à sua atenção em um momento importante.',
        steps: [
          'Abra a nota e escolha o controle de lembrete, representado por um relógio.',
          'Selecione a data e a hora.',
          'Quando disponível, escolha uma repetição diária, semanal ou mensal.',
          'Permita notificações no navegador ou dispositivo para receber os avisos.',
        ],
        note: 'O navegador pode suspender tarefas quando o app está fechado ou em segundo plano. Para itens críticos, mantenha também um lembrete no sistema do seu dispositivo.',
        keywords: 'lembrete relógio data hora repetir diário semanal mensal notificação',
      },
      {
        title: 'Lembretes por localização',
        summary: 'Em dispositivos compatíveis, uma nota pode usar uma localização como gatilho.',
        steps: [
          'Abra os controles de lembrete e selecione a opção por localização, quando exibida.',
          'Permita o acesso à localização no navegador e no dispositivo.',
          'Escolha se o gatilho deve considerar chegada ou saída, quando disponível.',
        ],
        note: 'A localização depende de permissão e suporte do navegador. O rastreamento pode não funcionar quando o navegador é suspenso ou o app está fechado.',
        keywords: 'localização GPS chegar sair lugar geolocalização permissão',
      },
      {
        title: 'Compartilhe uma nota',
        summary: 'Use o compartilhamento do dispositivo ou convide alguém para colaborar quando essa opção estiver disponível.',
        steps: [
          'Abra a nota e escolha Compartilhar.',
          'Para enviar o texto, use a opção de compartilhamento do sistema. Se ela não estiver disponível, o navegador pode oferecer uma alternativa por e-mail.',
          'Para convidar alguém, informe o e-mail da pessoa e crie o convite.',
          'A edição compartilhada pode sincronizar em tempo real para participantes autorizados.',
        ],
        note: 'Convites exigem uma nota já salva. Compartilhe apenas com pessoas que devem ter acesso ao conteúdo.',
        keywords: 'compartilhar enviar convidar colaborador email edição conjunta sincronizar',
      },
    ],
  },
  {
    id: 'data',
    title: 'Dados, instalação e segurança',
    description: 'Cuide dos seus registros e configure o app para seu jeito de trabalhar.',
    icon: ShieldCheck,
    articles: [
      {
        title: 'Exporte suas notas',
        summary: 'Mantenha uma cópia dos registros importantes fora do app.',
        steps: [
          'Na área lateral, escolha Exportar tudo para baixar um arquivo JSON das notas.',
          'Dentro de uma nota, abra Mais opções para exportar aquela nota como JSON, Markdown ou texto.',
          'Guarde a cópia em um local privado e organizado.',
        ],
        tip: 'Faça uma exportação antes de grandes reorganizações. Um arquivo exportado contém informação pessoal, então evite enviá-lo a lugares públicos.',
        keywords: 'exportar exportação download JSON Markdown txt texto backup cópia',
      },
      {
        title: 'Importe arquivos do Google Takeout',
        summary: 'A opção Importar Takeout aceita arquivos JSON e HTML. A importação depende do formato e dos campos presentes em cada arquivo.',
        steps: [
          'Exporte seus dados do Google Keep usando o Google Takeout.',
          'Na área lateral do Notas, escolha Importar Takeout.',
          'Selecione os arquivos JSON ou HTML que deseja importar.',
          'Revise as notas importadas e ajuste pastas, etiquetas e títulos quando necessário.',
        ],
        note: 'Na importação JSON, o app lê os campos title e content. Alguns arquivos do Google Keep usam textContent no lugar de content e podem entrar incompletos. Confira o resultado e guarde o arquivo original até validar os dados.',
        keywords: 'importar takeout Google Keep JSON HTML migração transferência',
      },
      {
        title: 'Instale o Notas como aplicativo',
        summary: 'Em navegadores compatíveis, o Notas pode ser instalado para abrir em uma janela própria ou na tela inicial.',
        steps: [
          'Abra Configurações no menu lateral.',
          'Procure Instalar o Notas.',
          'Quando o navegador oferecer a instalação, siga a confirmação na tela.',
        ],
        note: 'O botão de instalação depende do navegador, dispositivo e estado de instalação. Se não aparecer, o navegador pode não oferecer a opção naquele momento.',
        keywords: 'instalar aplicativo PWA app tela inicial computador celular configurações',
      },
      {
        title: 'Aparência e conta',
        summary: 'Adapte o visual e encerre a sessão quando estiver usando um dispositivo compartilhado.',
        steps: [
          'Em Configurações, escolha aparência do sistema, modo claro ou modo escuro.',
          'Use Sair na barra lateral para encerrar sua sessão.',
          'Se estiver em um computador compartilhado, feche a sessão e não deixe o navegador aberto com sua conta.',
        ],
        keywords: 'aparência sistema claro escuro conta logout sair sessão configurações',
      },
      {
        title: 'Entenda o bloqueio de texto',
        summary: 'O controle de bloqueio indica o estado do texto na interface.',
        steps: [
          'Abra uma nota e procure o ícone de bloqueio no editor.',
          'Use o controle para bloquear ou desbloquear o texto conforme o comportamento da interface.',
        ],
        note: 'Esse recurso não deve ser tratado como criptografia ou como substituto de senha, conta segura e controle de acesso. Não coloque segredos críticos supondo que esse botão os criptografa.',
        keywords: 'bloquear bloqueio privacidade segurança senha criptografia proteger',
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Estratégias avançadas',
    description: 'Transforme registros em conhecimento, decisões e próximos passos.',
    icon: Compass,
    articles: [
      {
        title: 'O ciclo de inteligência pessoal',
        summary: 'Use um processo simples para sair da curiosidade e chegar a uma ação consciente.',
        steps: [
          'Planeje: escreva a pergunta que quer responder ou o resultado que procura.',
          'Colete: registre fatos, ideias e referências relevantes em notas separadas.',
          'Processe: organize com pastas e etiquetas, anotando fonte e data quando forem importantes.',
          'Analise: conecte notas no Mapa para enxergar relações, lacunas e perguntas em aberto.',
          'Aja: transforme sua conclusão em checklist ou lembrete.',
          'Aprenda: registre o resultado e o que faria diferente na próxima vez.',
        ],
        tip: 'Diferencie fato observado, interpretação e hipótese. Isso evita tratar suposições como certezas.',
        keywords: 'inteligência pessoal planejar coletar processar analisar operação método sistema',
      },
      {
        title: 'O método dos cartões conectados',
        summary: 'Crie notas pequenas e específicas para montar uma base de conhecimento que cresce sem ficar confusa.',
        steps: [
          'Crie uma nota para cada ideia, livro, projeto, empresa ou pessoa relevante para você.',
          'Prefira títulos específicos e registre contexto, fonte e data quando forem importantes.',
          'Aplique etiquetas consistentes, como ideia, referência, projeto ou próxima ação.',
          'No Mapa, conecte notas relacionadas e pergunte por que a ligação importa.',
          'Revise conexões antigas quando surgirem novas informações.',
        ],
        tip: 'Uma conexão útil explica a relação: uma ideia veio desta referência, uma tarefa faz parte de um projeto ou duas fontes apontam para a mesma pergunta.',
        keywords: 'cartões notas conexão fonte pessoa empresa evento projeto conhecimento',
      },
      {
        title: 'Converta observações em decisões',
        summary: 'Um modelo simples separa o que aconteceu da decisão que você pretende tomar.',
        steps: [
          'Contexto: o que está tentando entender ou resolver?',
          'Evidências: o que observou de fato e de onde veio a informação?',
          'Interpretação: quais explicações são possíveis e o que ainda não sabe?',
          'Opções: quais caminhos existem e quais são seus custos?',
          'Próximo passo: qual ação pequena pode testar sua hipótese?',
          'Revisão: quando vai verificar o resultado?',
        ],
        tip: 'Em decisões importantes, anote o que faria você mudar de ideia. Isso facilita corrigir o rumo diante de novas evidências.',
        keywords: 'decisão análise evidência hipótese estratégia próximo passo contexto revisar',
      },
      {
        title: 'Conecte a visão de longo prazo com o presente',
        summary: 'Objetivos distantes ficam mais concretos quando ligados a projetos e ações que você pode executar hoje.',
        steps: [
          'Crie uma pasta para sua visão de longo prazo, se essa estrutura ajudar.',
          'Escreva o resultado desejado e por que ele importa.',
          'Crie notas para os projetos e competências que podem contribuir para esse resultado.',
          'Conecte projetos no Mapa e transforme a próxima ação em checklist.',
          'Reserve uma revisão mensal para ajustar prioridades com base no que aprendeu.',
        ],
        tip: 'Um horizonte de cinco ou dez anos é uma ferramenta de reflexão, não uma previsão. Reavalie suas escolhas conforme sua realidade mudar.',
        keywords: 'jogo longo visão dez anos objetivos futuro horizonte planejamento revisão',
      },
      {
        title: 'Mapeie relacionamentos com respeito',
        summary: 'O Mapa pode ajudar você a lembrar de contextos e oportunidades de colaboração sem transformar pessoas em alvos.',
        steps: [
          'Registre apenas informações apropriadas e necessárias para seu contexto.',
          'Anote interesses compartilhados, compromissos assumidos e maneiras genuínas de oferecer ajuda.',
          'Conecte pessoas a projetos ou temas quando a relação for relevante e tiver fundamento.',
          'Use lembretes para cumprir promessas e fazer acompanhamentos oportunos.',
          'Revise as notas e remova dados desnecessários ou desatualizados.',
        ],
        note: 'Respeite consentimento, privacidade e limites. Não registre segredos, dados sensíveis ou informações obtidas sem autorização. O Mapa não analisa pessoas automaticamente.',
        keywords: 'rede contatos aliados relacionamentos influência reciprocidade follow up networking',
      },
    ],
  },
  {
    id: 'legacy',
    title: 'Módulos antigos',
    description: 'Entenda o histórico do RiseGoat sem confundir tabelas antigas com recursos disponíveis.',
    icon: History,
    articles: [
      {
        title: 'O que são os módulos legados?',
        summary: 'Versões anteriores do RiseGoat incluíam ideias e ferramentas além do Notas.',
        steps: [
          'Business e Growth: estruturas históricas ligadas a produtos, ofertas, lançamentos, receitas e parcerias.',
          'Authority e Intelligence: tabelas antigas relacionadas a contatos, conexões, tarefas e fontes.',
          'Action Flows e Workflows: estruturas históricas para fluxos, execuções e etapas.',
          'Books e Resources: tabelas antigas ligadas a livros, capítulos e recursos.',
          'Personal: estruturas históricas para hábitos, metas, métricas e sessões.',
        ],
        note: 'Esses nomes descrevem tabelas e módulos históricos no banco. Não significam que exista uma tela funcional para cada módulo. A interface atual se concentra em Notas, Mapa e Configurações. Reativar um módulo exige desenvolvimento e validação próprios.',
        keywords: 'legado antigo módulos business growth authority intelligence action flows workflow books personal metas hábitos banco tabelas',
      },
      {
        title: 'Como aproveitar esse histórico hoje',
        summary: 'Priorize um uso claro para o produto atual antes de planejar a reativação de módulos antigos.',
        steps: [
          'Use Notas para registrar ideias, referências, tarefas e informações relevantes para seus projetos.',
          'Use pastas e etiquetas para separar contextos sem depender dos módulos antigos.',
          'Conecte notas no Mapa para testar se essa organização já resolve sua necessidade.',
          'Antes de reativar um módulo, revise esquema, permissões, telas, integrações e migrações.',
        ],
        tip: 'A existência de uma tabela no banco não prova que o recurso esteja pronto. Uma funcionalidade completa precisa de interface, permissões e comportamento testado.',
        keywords: 'reativar futuro sistema modular banco dados esquema interface permissões migração',
      },
    ],
  },
  {
    id: 'security',
    title: 'Privacidade e segurança',
    description: 'Proteja seus registros e use o compartilhamento com consciência.',
    icon: ShieldCheck,
    articles: [
      {
        title: 'Pense antes de registrar informações sensíveis',
        summary: 'Guarde o que for útil sem acumular dados pessoais ou segredos desnecessários.',
        steps: [
          'Evite guardar senhas, tokens, dados bancários ou documentos de identidade completos nas notas.',
          'Ao registrar informações sobre outra pessoa, limite-se ao que é relevante, legítimo e apropriado.',
          'Use pastas e etiquetas para encontrar registros, não como substituto de controle de acesso.',
          'Revise notas antigas e elimine dados que deixaram de ser necessários.',
        ],
        tip: 'Escreva cada nota imaginando que um dia ela poderá ser vista por alguém que não era o destinatário original.',
        keywords: 'OPSEC segurança operacional privacidade discrição dados pessoais sigilo segredo senha token compartimentação',
      },
      {
        title: 'Compartilhe com cuidado',
        summary: 'Compartilhar dá acesso real ao conteúdo. Confira o destinatário antes de enviar um convite.',
        steps: [
          'Confira se abriu a nota correta e se o conteúdo pode ser compartilhado.',
          'Digite com cuidado o e-mail da pessoa convidada.',
          'Considere que os convites de colaboração atuais concedem acesso de edição.',
          'Compartilhe apenas com pessoas que realmente precisam desse conteúdo.',
        ],
        note: 'A interface atual não oferece um painel completo para listar e revogar todos os acessos. Não use o compartilhamento para material que exija permissões granulares ou revogação garantida.',
        keywords: 'OPSEC compartilhar convite edição acesso colaborador email permissões revogar remover',
      },
      {
        title: 'Tenha cópias e saiba o que elas incluem',
        summary: 'Exportar ajuda a manter registros, mas o arquivo gerado não substitui necessariamente um backup completo.',
        steps: [
          'Use Exportar tudo para baixar o JSON dos registros de notas disponíveis.',
          'Para uma nota individual, abra Mais opções e escolha JSON, Markdown ou texto.',
          'Guarde os arquivos em um local privado e confira se consegue abrir o conteúdo.',
          'Se anexos, checklists, etiquetas e lembretes forem importantes, confira esses dados separadamente.',
        ],
        note: 'A exportação geral atual serializa as notas. Não a trate como cópia integral de todos os anexos e registros relacionados.',
        keywords: 'backup exportação cópia segurança JSON anexos checklist etiquetas lembretes recuperar',
      },
      {
        title: 'O que o bloqueio de texto não garante',
        summary: 'O botão de bloqueio na nota não deve ser confundido com uma camada comprovada de criptografia.',
        steps: [
          'Use uma senha forte na conta e não compartilhe suas credenciais.',
          'Encerre a sessão quando usar um dispositivo compartilhado.',
          'Não guarde segredos críticos supondo que o ícone de bloqueio os criptografe.',
        ],
        note: 'O controle de bloqueio não equivale, por si só, a criptografia ponta a ponta, autenticação multifator ou garantia de que o conteúdo não possa ser lido por quem já tem acesso à conta.',
        keywords: 'bloqueio criptografia criptografar ponta a ponta MFA 2FA senha autenticação segurança',
      },
    ],
  },
  {
    id: 'principles',
    title: 'Filosofia do RiseGoat',
    description: 'Clareza, conhecimento, relações, atenção e ação como princípios de uso.',
    icon: Network,
    articles: [
      {
        title: 'Capturar, conectar, agir e aprender',
        summary: 'A ferramenta ganha valor quando as informações ajudam você a decidir ou fazer algo melhor.',
        steps: [
          'Capturar tira uma ideia importante da cabeça e a coloca em um lugar confiável.',
          'Organizar dá contexto para recuperar a ideia depois.',
          'Conectar ajuda a enxergar como uma nota se relaciona a outras informações.',
          'Agir transforma a conclusão em uma tarefa, conversa, teste ou decisão.',
          'Aprender é registrar o resultado e atualizar o que você acreditava antes.',
        ],
        tip: 'Nem toda nota precisa virar um projeto. Algumas existem apenas para preservar uma memória, uma referência ou uma reflexão útil.',
        keywords: 'filosofia capturar conectar visualizar agir transformar memória extensão da mente',
      },
      {
        title: 'Cinco pilares para orientar suas notas',
        summary: 'Use estes pilares como lentes para revisar o que você está aprendendo e construindo.',
        steps: [
          'Mente: registre reflexões, perguntas e lições aprendidas.',
          'Conhecimento: guarde referências, fontes, conceitos e conexões entre ideias.',
          'Rede: acompanhe compromissos e relações de colaboração de forma respeitosa.',
          'Atenção: registre prioridades e reduza o que compete por sua energia.',
          'Valor: conecte habilidades e projetos aos problemas reais que deseja resolver.',
        ],
        tip: 'Os pilares são uma estrutura pessoal de reflexão, não recursos automáticos ou promessas de resultados financeiros.',
        keywords: 'cinco pilares mente conhecimento rede atenção dinheiro valor riqueza disciplina',
      },
      {
        title: 'Mantenha o sistema simples o bastante para usar',
        summary: 'Um sistema de organização só ajuda se você consegue mantê-lo no cotidiano.',
        steps: [
          'Capture a informação assim que for prático.',
          'Use um título útil e o contexto mínimo necessário.',
          'Organize quando surgir uma necessidade real de encontrar ou executar algo.',
          'Revise as notas importantes em um ritmo que caiba na sua rotina.',
          'Mude a estrutura se ela começar a atrapalhar em vez de ajudar.',
        ],
        tip: 'O RiseGoat não garante poder, influência ou riqueza. Ele ajuda a preservar o que importa para que você possa pensar e agir com mais clareza.',
        keywords: 'simplicidade disciplina filosofia consistência rotina clareza atenção propósito',
      },
    ],
  },
  {
    id: 'troubleshoot',
    title: 'Quando algo não funciona',
    description: 'Verificações rápidas para os recursos que dependem do navegador ou do dispositivo.',
    icon: CircleHelp,
    articles: [
      {
        title: 'O áudio ou a transcrição não inicia',
        summary: 'Gravação e transcrição dependem de APIs do navegador e de permissões de microfone.',
        steps: [
          'Confira se o site está aberto em uma conexão segura HTTPS.',
          'Permita o uso do microfone nas configurações do navegador.',
          'Feche outros apps que possam estar usando o microfone e tente novamente.',
          'Teste um navegador atualizado compatível com gravação de mídia e reconhecimento de voz.',
        ],
        note: 'Nem todo navegador oferece reconhecimento de voz. Se a gravação ou a transcrição continuar falhando, o recurso pode precisar de uma correção no app, não apenas de uma mudança nas permissões.',
        keywords: 'áudio não funciona gravar transcrever transcrição microfone permissão speech reconhecimento de voz',
      },
      {
        title: 'Uma notificação ou lembrete não chegou',
        summary: 'O recebimento depende das permissões do navegador e de como o dispositivo mantém o app em execução.',
        steps: [
          'Confira se as notificações estão permitidas para o site.',
          'Confira a data, a hora e o fuso do dispositivo.',
          'Para lembretes de localização, confirme também a permissão de localização.',
          'Se o navegador estava fechado ou suspenso, teste com o app aberto antes de confiar no comportamento.',
        ],
        keywords: 'notificação lembrete não chegou permissão horário fuso localização',
      },
      {
        title: 'Uma nota ou conexão não aparece',
        summary: 'Filtros ativos e o contexto atual podem ocultar informações sem apagá-las.',
        steps: [
          'Limpe o texto da busca e reveja os filtros.',
          'Confira se a nota está em Fixadas, Arquivo ou Lixeira, ou dentro de outra pasta.',
          'No Mapa, confira se a pasta, a etiqueta ou o modo Local estão limitando a visão.',
          'Se o problema persistir, recarregue o app e verifique a conexão.',
        ],
        keywords: 'nota sumiu não aparece conexão mapa filtro pasta arquivada sincronização',
      },
    ],
  },
];

type HelpCenterProps = {
  open: boolean;
  onClose: () => void;
  onCreateNote: () => void;
  onOpenMap: () => void;
};

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function HelpCenter({ open, onClose, onCreateNote, onOpenMap }: HelpCenterProps) {
  const [activeId, setActiveId] = useState('start');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const activeCategory = helpCategories.find(category => category.id === activeId) ?? helpCategories[0];
  const normalizedQuery = normalize(query.trim());

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return helpCategories.flatMap(category =>
      category.articles
        .filter(article => normalize([
          category.title,
          article.title,
          article.summary,
          article.steps.join(' '),
          article.tip ?? '',
          article.note ?? '',
          article.keywords,
        ].join(' ')).includes(normalizedQuery))
        .map(article => ({ ...article, categoryTitle: category.title, categoryId: category.id })),
    );
  }, [normalizedQuery]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => searchRef.current?.focus(), 40);
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const chooseCategory = (id: string) => {
    setActiveId(id);
    setQuery('');
  };

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && results.length > 0) {
      const first = results[0];
      setActiveId(first.categoryId);
      setQuery('');
    }
  };

  if (!open) return null;

  return (
    <div
      className="help-center-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="help-center-dialog" role="dialog" aria-modal="true" aria-labelledby="help-center-title">
        <header className="help-center-header">
          <div className="help-center-brand">
            <span className="help-center-mark"><CircleHelp size={19} /></span>
            <div>
              <p>RISEGOAT · CENTRAL DE AJUDA</p>
              <h2 id="help-center-title">Use o RiseGoat ao máximo.</h2>
              <span>Capture, organize e conecte informações para transformar ideias em ação.</span>
            </div>
          </div>
          <button type="button" className="help-center-close" onClick={onClose} aria-label="Fechar ajuda" title="Fechar ajuda"><X size={19} /></button>
        </header>

        <div className="help-center-search-wrap">
          <Search size={17} />
          <input
            ref={searchRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Busque um recurso, uma dúvida ou uma palavra..."
            aria-label="Buscar na central de ajuda"
          />
          {query ? (
            <button type="button" aria-label="Limpar busca" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X size={15} /></button>
          ) : <kbd><Command size={11} /> ajuda</kbd>}
        </div>

        <div className="help-center-layout">
          <nav className="help-center-nav" aria-label="Tópicos de ajuda">
            <p className="help-center-nav-label">APRENDA POR TEMA</p>
            {helpCategories.map(category => {
              const Icon = category.icon;
              return (
                <button
                  type="button"
                  key={category.id}
                  className={activeId === category.id && !query ? 'active' : ''}
                  onClick={() => chooseCategory(category.id)}
                >
                  <Icon size={16} />
                  <span>{category.title}</span>
                  <ChevronRight size={14} />
                </button>
              );
            })}
            <div className="help-center-nav-note">
              <Sparkles size={15} />
              <p>Uma boa nota é aquela que ajuda você a agir ou a lembrar melhor.</p>
            </div>
          </nav>

          <main className="help-center-content">
            {normalizedQuery ? (
              <>
                <div className="help-center-section-heading">
                  <div>
                    <span className="help-center-eyebrow">PESQUISA NA AJUDA</span>
                    <h3>{results.length ? 'Encontramos estas orientações' : 'Nenhum resultado encontrado'}</h3>
                    <p>{results.length ? results.length + (results.length === 1 ? ' artigo para ' : ' artigos para ') + '“' + query.trim() + '”.' : 'Tente outro termo ou escolha um tema na lista ao lado.'}</p>
                  </div>
                </div>
                {results.map((article, index) => (
                  <HelpArticleCard
                    key={article.categoryId + '-' + article.title}
                    article={article}
                    categoryTitle={article.categoryTitle}
                    number={index + 1}
                  />
                ))}
              </>
            ) : (
              <>
                <div className="help-center-section-heading">
                  <div>
                    <span className="help-center-eyebrow">GUIA PRÁTICO</span>
                    <h3>{activeCategory.title}</h3>
                    <p>{activeCategory.description}</p>
                  </div>
                  <span className="help-center-count">{activeCategory.articles.length} guias</span>
                </div>
                {activeCategory.articles.map((article, index) => (
                  <HelpArticleCard key={article.title} article={article} number={index + 1} />
                ))}
              </>
            )}

            <div className="help-center-next">
              <div className="help-center-next-icon"><BookOpen size={18} /></div>
              <div className="help-center-next-copy">
                <strong>Leve a ideia para a prática</strong>
                <span>O melhor jeito de aprender é experimentar com uma nota real.</span>
              </div>
              <button type="button" onClick={() => { onClose(); onCreateNote(); }}><FileText size={15} /> Criar nota</button>
              <button type="button" className="secondary" onClick={() => { onClose(); onOpenMap(); }}><Map size={15} /> Abrir mapa</button>
            </div>
            <p className="help-center-footer-note">Os recursos podem variar conforme o navegador, as permissões do dispositivo e o estado de conexão.</p>
          </main>
        </div>
      </section>
    </div>
  );
}

function HelpArticleCard({
  article,
  number,
  categoryTitle,
}: {
  article: HelpArticle;
  number: number;
  categoryTitle?: string;
}) {
  return (
    <article className="help-center-article">
      <div className="help-center-article-top">
        <span className="help-center-article-number">{String(number).padStart(2, '0')}</span>
        <div>
          {categoryTitle && <span className="help-center-result-category">{categoryTitle}</span>}
          <h4>{article.title}</h4>
          <p>{article.summary}</p>
        </div>
      </div>
      <ol>
        {article.steps.map((step, index) => <li key={index}>{step}</li>)}
      </ol>
      {article.tip && <div className="help-center-tip"><Sparkles size={15} /><p><strong>Dica prática</strong>{article.tip}</p></div>}
      {article.note && <div className="help-center-note"><CircleHelp size={15} /><p><strong>Importante</strong>{article.note}</p></div>}
    </article>
  );
}

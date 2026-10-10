import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Bell, BookOpen, ChevronDown, ChevronRight, CircleHelp, Command,
  Download, FileText, Folder, Map, Search, ShieldCheck,
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
        summary: 'Escolha o formato que melhor combina com a informação que você quer guardar.',
        steps: [
          'Texto: ideias, explicações, rascunhos e referências.',
          'Checklist: tarefas, compras e etapas de um projeto.',
          'Imagem: fotos e referências visuais. Em celulares compatíveis, o seletor pode oferecer a câmera.',
        ],
        tip: 'Comece pelo formato mais simples e organize a nota com pastas, etiquetas ou conexões quando isso fizer sentido.',
        keywords: 'texto checklist lista imagem foto câmera formato tipo criar nota',
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
        title: 'Formate o texto de uma nota',
        summary: 'O editor de texto oferece formatação básica para destacar informações e inserir links.',
        steps: [
          'Abra uma nota do tipo Texto.',
          'Use a barra de formatação para aplicar negrito, itálico ou sublinhado.',
          'Use o controle de link para inserir um endereço web.',
          'Para exportar uma nota como Markdown, abra Mais opções e escolha Markdown.',
        ],
        keywords: 'formatar texto negrito itálico sublinhado link editor Markdown',
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
        title: 'Comece com um modelo de pasta',
        summary: 'Os modelos criam uma estrutura inicial com notas, checklists, etiquetas e conexões.',
        steps: [
          'Na seção Pastas da barra lateral, clique no botão ao lado do título Pastas.',
          'Escolha uma estrutura pronta ou crie uma pasta vazia.',
          'Revise as notas e conexões criadas pelo modelo e adapte-as ao seu trabalho.',
        ],
        tip: 'Um modelo é um ponto de partida. Exclua ou edite o que não fizer sentido para seu sistema.',
        keywords: 'modelo modelos pasta template estrutura pronta criar pasta checklist etiqueta conexões',
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
        title: 'Anexe arquivos a uma nota',
        summary: 'Guarde documentos e outros arquivos junto da nota relacionada.',
        steps: [
          'Abra a nota em que deseja guardar o arquivo.',
          'No rodapé do editor, escolha Anexar arquivo e selecione o documento.',
          'Os arquivos ficam no armazenamento privado da sua conta, com os metadados registrados no banco de dados. Downloads exigem uma sessão autorizada.',
          'Na lista Arquivos anexados, você pode baixar o arquivo ou excluir os que enviou.',
        ],
        keywords: 'anexo anexar arquivo PDF documento upload baixar segurança privado',
      },
      {
        title: 'Salve um card como PNG',
        summary: 'Exporte uma imagem da nota que você pode compartilhar nas redes sociais.',
        steps: [
          'Na grade de notas, abra Mais opções no card.',
          'Escolha Salvar card como PNG.',
          'A imagem é gerada em alta resolução, com o card centralizado e margem de 20 px em todos os lados.',
          'Revise a imagem antes de publicar para confirmar que ela não contém informações privadas.',
        ],
        keywords: 'PNG imagem post redes sociais exportar cartão card salvar compartilhar',
      },
      {
        title: 'Entenda a Lixeira',
        summary: 'Excluir uma nota não é o mesmo que apagá-la permanentemente.',
        steps: [
          'As notas excluídas vão para a Lixeira.',
          'Abra o menu de ações do cartão para restaurar uma nota.',
          'Use Excluir definitivamente apenas quando tiver certeza de que não precisa mais dela.',
        ],
        note: 'As notas ficam na Lixeira até serem restauradas, excluídas manualmente ou removidas definitivamente após 30 dias.',
        keywords: 'lixeira excluir apagar restaurar recuperar permanente',
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
          'A busca também considera texto extraído de imagens quando esse dado existe na nota.',
          'Limpe a busca para voltar à lista completa do filtro atual.',
        ],
        tip: 'Palavras concretas geralmente funcionam melhor do que perguntas inteiras. Pesquise também por um termo que você lembra ter escrito.',
        keywords: 'buscar busca pesquisar pesquisa título conteúdo texto OCR localizar',
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
      {
        title: 'Gerencie quem tem acesso',
        summary: 'O proprietário pode conferir os convites e os participantes de uma nota compartilhada.',
        steps: [
          'Abra a nota e escolha Compartilhar.',
          'Veja quem aceitou o convite e a permissão de cada participante.',
          'Use Revogar para remover o acesso de um participante.',
          'Em Convites pendentes, escolha Cancelar para invalidar um convite que ainda não foi aceito.',
        ],
        note: 'Revogar o acesso não apaga cópias que alguém já tenha feito enquanto tinha acesso à nota.',
        keywords: 'acesso permissão revogar remover colaborador cancelar convite compartilhar proprietário',
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
        title: 'Faça um backup completo',
        summary: 'Exporte suas notas e os dados relacionados em um arquivo JSON que também inclui os anexos.',
        steps: [
          'Na barra lateral, escolha Exportar backup completo.',
          'O arquivo reúne notas, checklists, etiquetas, pastas, lembretes, conexões, colaboradores, convites e anexos.',
          'Imagens e arquivos são embutidos no JSON em Base64. Por isso, o arquivo pode ficar grande se você tiver muitos anexos.',
          'Dentro de uma nota, Mais opções também permite exportar apenas aquela nota como JSON, Markdown ou texto.',
          'Guarde o backup em um local privado. Ele pode conter informações pessoais e conteúdo compartilhado.',
        ],
        keywords: 'exportar exportação download JSON Markdown txt backup cópia anexos checklist etiquetas pastas lembretes',
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
        note: 'O importador aceita title e content ou textContent. Notas do tipo lista em listContent são importadas como checklists, preservando itens marcados e subitens quando disponíveis. Mantenha o arquivo original até confirmar a migração.',
        keywords: 'importar takeout Google Keep JSON HTML migração transferência',
      },
      {
        title: 'Crie uma conta ou recupere a senha',
        summary: 'A tela de acesso permite criar uma conta e solicitar a redefinição da senha por e-mail.',
        steps: [
          'Na tela de entrada, escolha Criar conta e informe seu e-mail e uma senha com pelo menos seis caracteres.',
          'Se a confirmação de e-mail for solicitada, abra a mensagem recebida para concluir o cadastro.',
          'Se esquecer a senha, escolha Esqueci minha senha e solicite o link de redefinição.',
          'Abra o link recebido e escolha uma nova senha.',
        ],
        keywords: 'criar conta cadastro entrar login esquecer senha recuperar senha redefinir e-mail confirmação',
      },
      {
        title: 'Exclua notas e entenda os limites da conta',
        summary: 'A exclusão de notas está disponível; a exclusão completa da conta ainda não é oferecida pela interface.',
        steps: [
          'Para remover uma nota, envie-a para a Lixeira.',
          'Na Lixeira, restaure notas quando necessário ou exclua-as definitivamente depois de confirmar.',
          'Notas na Lixeira são removidas permanentemente após 30 dias quando os dados são carregados.',
        ],
        note: 'A interface atual não oferece uma opção de autoexclusão completa da conta. Excluir uma nota não equivale a excluir a conta inteira.',
        keywords: 'excluir apagar nota conta dados pessoais lixeira 30 dias recuperar',
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
          'Abra Configurações e escolha Sair da conta para encerrar sua sessão.',
          'Se estiver em um computador compartilhado, feche a sessão e não deixe o navegador aberto com sua conta.',
        ],
        keywords: 'aparência sistema claro escuro conta logout sair sessão configurações',
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
          'Confira o nível escolhido no convite: pode editar ou somente leitura.',
          'Compartilhe apenas com pessoas que realmente precisam desse conteúdo.',
        ],
        note: 'O proprietário pode cancelar convites pendentes e revogar participantes. A revogação não apaga cópias que alguém tenha feito enquanto tinha acesso.',
        keywords: 'OPSEC compartilhar convite edição acesso colaborador email permissões revogar remover',
      },
      {
        title: 'Use o modo Somente leitura',
        summary: 'O modo Somente leitura ajuda a evitar alterações acidentais no editor.',
        steps: [
          'Abra uma nota e ative o ícone de olho para entrar em Somente leitura.',
          'Para voltar a editar, desative o modo pelo mesmo controle.',
        ],
        note: 'Somente leitura é um bloqueio de edição na interface, não criptografa nem oculta o conteúdo. Use o compartilhamento para definir quem pode editar e encerre a sessão em dispositivos compartilhados.',
        keywords: 'somente leitura editar modo visualização alteração acidental olho',
      },
    ],
  },
  {
    id: 'troubleshoot',
    title: 'Quando algo não funciona',
    description: 'Verificações rápidas para problemas comuns nas notas e no Mapa.',
    icon: CircleHelp,
    articles: [
      {
        title: 'Conexão, limites e suporte',
        summary: 'Saiba o que a interface atual confirma e o que ela ainda não informa.',
        steps: [
          'Mantenha uma conexão com a internet para carregar as notas e sincronizar alterações com a conta.',
          'O app não oferece garantia de funcionamento completo offline; instalar como PWA não significa que todos os dados estarão disponíveis sem conexão.',
          'A interface atual não publica números oficiais de limite de notas ou tamanho de anexos, nem apresenta planos ou preços.',
          'Não há um canal de suporte de contato exibido dentro do app. A Central de Ajuda não inventa um endereço de e-mail ou prazo de resposta.',
        ],
        keywords: 'internet offline sincronização dispositivos limite tamanho anexo planos preços contato suporte',
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

  const exportGuide = () => {
    const lines: string[] = ['# Central de Ajuda do RiseGoat Notas', ''];
    for (const category of helpCategories) {
      lines.push('## ' + category.title, category.description, '');
      for (const article of category.articles) {
        lines.push('### ' + article.title, article.summary, '');
        lines.push(...article.steps.map(step => '- ' + step), '');
        if (article.tip) lines.push('**Dica prática:** ' + article.tip, '');
        if (article.note) lines.push('**Importante:** ' + article.note, '');
      }
      lines.push('');
    }
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'guia-risegoat.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
              <p>RISEGOAT NOTAS · CENTRAL DE AJUDA</p>
              <h2 id="help-center-title">Use o RiseGoat Notas ao máximo.</h2>
              <span>Capture, organize e conecte informações para transformar ideias em ação.</span>
            </div>
          </div>
          <div className="help-center-header-actions"><button type="button" className="help-center-export" onClick={exportGuide}><Download size={15} /><span>Exportar guia</span></button><button type="button" className="help-center-close" onClick={onClose} aria-label="Fechar ajuda" title="Fechar ajuda"><X size={19} /></button></div>
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
                    defaultOpen
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
                  <HelpArticleCard key={article.title} article={article} number={index + 1} defaultOpen={index === 0} />
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
  defaultOpen = false,
}: {
  article: HelpArticle;
  number: number;
  categoryTitle?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className="help-center-article" open={defaultOpen}>
      <summary className="help-center-article-top">
        <span className="help-center-article-number">{String(number).padStart(2, '0')}</span>
        <div>
          {categoryTitle && <span className="help-center-result-category">{categoryTitle}</span>}
          <h4>{article.title}</h4>
          <p>{article.summary}</p>
        </div>
        <ChevronDown className="help-center-article-chevron" size={16} />
      </summary>
      <ol>
        {article.steps.map((step, index) => <li key={index}>{step}</li>)}
      </ol>
      {article.tip && <div className="help-center-tip"><Sparkles size={15} /><p><strong>Dica prática</strong>{article.tip}</p></div>}
      {article.note && <div className="help-center-note"><CircleHelp size={15} /><p><strong>Importante</strong>{article.note}</p></div>}
    </details>
  );
}

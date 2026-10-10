# Tabuleiro RiseGoat

O Tabuleiro é um diretório curado de perfis, empresas, fontes e conexões. Não é um ranking oficial nem uma base de patrimônio auditada. A faixa financeira, quando preenchida, deve ter data e referência verificável.

## Rotas

- \`/tabuleiro\`: busca por nome/biografia, setor, país, região, tipo e faixa estimada; filtros são preservados em query parameters.
- \`/tabuleiro/:slug\`: detalhe de perfil, organizações, relações e referências.
- \`/tabuleiro/grafo\`: grafo navegável, com agrupamento visual por setor e conexões carregadas da base.
- O conteúdo público só mostra perfis com \`visivel_publico=true\`. Membros autenticados podem consultar os perfis privados. Escrita e curadoria são restritas a administradores.

## Rotina de curadoria

1. Importar um CSV autorizado/exportado da fonte licenciada com \`scripts/tabuleiro/import-forbes-csv.mjs\`. O script deixa tudo privado por padrão.
2. Rodar \`scripts/tabuleiro/enrich-wikidata.mjs\` para anexar referências sugeridas em correspondências exatas. Candidatos aproximados saem em relatório privado para revisão.
3. Rodar \`scripts/tabuleiro/enrich-sec-edgar.mjs\` para associar fontes SEC por correspondência exata de empresa. Candidatos aproximados vão para revisão; o script não extrai pessoas de conselhos automaticamente.
4. \`scripts/tabuleiro/enrich-opensecrets.mjs\` gera relatório local de organizações e contexto de contribuições para revisão; exige \`OPEN_SECRETS_API_KEY\`.
5. \`scripts/tabuleiro/enrich-propublica.mjs\` gera candidatos de fundações/nonprofits. Nome parecido não prova que uma entidade pertença a uma pessoa.
6. Preparar e revisar \`board-memberships.csv\` usando documentos oficiais. Rodar \`scripts/tabuleiro/build-board-interlocks.mjs board-memberships.csv\` primeiro sem \`--approve-reviewed\` para registrar sugestões. Depois de revisão manual, usar a opção para promover somente as linhas explicitamente marcadas como revisadas. O script só cria conexões quando os assentos verificados se sobrepõem no tempo.
7. Abrir cada perfil, conferir nome, setor, país, biografia, fontes e conexões. Publicar com a ação administrativa apenas quando o conjunto for confiável.

## CSV de importação

Campos recomendados para a importação base: \`name,slug,sector,country,region,wealth_band,net_worth_usd,bio,source_title,source_url,tags,curadoria_aprovada\`. Setor e faixa financeira devem respeitar os enums do schema. O importador não faz scraping do site da Forbes: recebe um arquivo de origem autorizado e guarda registros privados por padrão.

CSV para vínculos de conselho:
\`company_name,person_slug,role,source_url,start_date,end_date,reviewed\`. Cada assento precisa de fonte oficial (por exemplo, declaração/proxy statement SEC ou página oficial de governança) e datas conferidas. Datas desconhecidas não geram interlock automático.

## Segurança e métricas

- Conexões públicas só são retornadas se os dois perfis estão públicos.
- A abertura de detalhe registra uma visualização via RPC. Para anônimo, só é permitido registrar visualização de perfil público.
- O painel admin usa RPCs administrativas agregadas e exporta CSV de contagens/IDs, sem texto de notas pessoais.
- Notas dentro de círculos só aparecem para membros aceitos daquele círculo.
- Nenhuma fonte/candidato passa a público automaticamente por ser retornado por uma API.

## API e cadência operacional

Scripts usam \`SUPABASE_URL\`, \`RISEGOAT_VAULT_PATH\` (opcional) e \`RISEGOAT_VAULT_PASSPHRASE\` localmente. A chave \`service_role\` é descriptografada apenas em memória por um script de administração e não faz parte do build web. Fonte que exige autenticação usa token local (por exemplo, OpenSecrets); não copie tokens para CSV, relatório ou banco.

Rotina sugerida: revisar dez nomes novos por semana, revisar fontes antes de marcar como público, revisar patrimônio mensalmente e revisar conexões trimestralmente. A primeira base deve ser pequena e rigorosamente referenciada em vez de ampla e especulativa.

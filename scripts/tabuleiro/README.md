# Enriquecimento do Tabuleiro

O script é opcional; ele não roda no build nem no deploy do site. Configure credenciais administrativas apenas no terminal ou no ambiente local. Nunca coloque a chave service role no frontend, em variáveis VITE_* ou no Git.

## Configuração

Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local. A importação inicial recebe um JSON autorizado por FORBES_DATA_FILE ou por FORBES_DATA_URL. O script não faz scraping de páginas protegidas.

Adapters opcionais:

- Wikidata: consulta SPARQL e adiciona referência de entidade e nacionalidade quando a correspondência do nome é exata.
- SEC EDGAR: compara empresas já cadastradas com o diretório público de tickers e registra a URL correspondente.
- OpenSecrets: requer OPENSECRETS_API_URL e OPENSECRETS_API_KEY fornecidos pela sua conta; não presume um endpoint específico.
- ProPublica Nonprofit Explorer: pesquisa possíveis organizações sem fins lucrativos e registra a URL de origem para revisão.
- Conexões: requer TABULEIRO_INTERLOCKS_FILE, contendo relações revisadas e fonte verificável.

TABULEIRO_RATE_LIMIT_MS controla o intervalo (mínimo 350 ms). TABULEIRO_CHECKPOINT permite escolher o caminho do checkpoint. O padrão é .cache/tabuleiro-checkpoint.json.

## Comandos

- npm run tabuleiro:forbes -- --dry-run
- npm run tabuleiro:wikidata -- --dry-run
- npm run tabuleiro:sec -- --dry-run
- npm run tabuleiro:opensecrets -- --dry-run
- npm run tabuleiro:propublica -- --dry-run
- npm run tabuleiro:conexoes -- --dry-run
- npm run tabuleiro:all -- --dry-run

O parâmetro --dry-run evita gravações, mas os adaptadores que consultam pessoas/empresas ainda precisam ler o banco para conseguir cruzar os registros. Upserts são idempotentes por slug ou chaves únicas. O script registra progresso e checkpoints. As relações entre pessoas nunca são inferidas apenas por coincidência de nomes ou por especulação política: cada conexão precisa vir de dados revisados e de uma fonte.

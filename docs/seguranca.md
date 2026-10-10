# Segurança da RiseGoat

**Estado da auditoria:** 10 de outubro de 2026. Esta página registra o que foi verificado no projeto Supabase \`xofrlyblnsvcjsywynzu\` e o que ainda depende de acesso operacional ao Vercel.

## RLS e políticas

- Foram auditadas 102 tabelas no schema \`public\`: RLS habilitado em 102/102, RLS forçado em 102/102 após a migração \`security_admin_audit_rls_force\`, e nenhuma tabela pública sem política RLS no momento da auditoria.
- \`admin_users\` é a tabela canônica adicional de administradores. O conteúdo é sincronizado de \`app_admins\` para manter compatibilidade com políticas existentes.
- \`admin_audit_log\` registra abertura do painel e alterações administrativas de status da lista de espera/convites. O log guarda identificadores e metadados operacionais, nunca texto de notas.
- \`notes-media\` é privado. Leitura exige o proprietário do caminho ou acesso autorizado à nota através de \`private.user_can_access_note\`. Uploads são restritos ao caminho do usuário autenticado. A política de seleção não concede acesso a \`anon\`.
- Os buckets legados \`goat-media\` e \`risegoat-media\` continuam públicos, com políticas de leitura pública. Foram identificados na auditoria, mas não alterados porque podem conter assets públicos do site. Rever objetos e uso antes de os tornar privados.

RLS forçado não substitui políticas corretas, controle de papéis ou teste contra os papéis reais da API. Funções \`SECURITY DEFINER\` continuam exigindo revisão individual.

## Service role e variáveis

- O bundle do navegador usa a URL pública e uma chave publishable do Supabase, não a chave \`service_role\`.
- A pesquisa de código versionado não encontrou \`service_role\` nem \`SUPABASE_SERVICE_ROLE_KEY\` em código frontend.
- A listagem das variáveis do projeto Vercel não pôde ser verificada por falta de autorização do conector à equipe \`brit-real\`. Portanto, não é correto afirmar que a chave está ausente de todas as variáveis de ambiente.
- **Não** colocar \`service_role\` em \`VITE_*\`, arquivos versionados, chats, imagens ou builds de navegador. Guardar a chave operacional em um gerenciador de segredos/arquivo criptografado fora do repositório, com acesso restrito. Se a chave já foi exposta em bundle, logs ou Git, rotacioná-la no Supabase e atualizar somente os serviços de servidor que realmente precisem dela.
- O app normal deve usar a chave publishable e RLS. A chave administrativa só deve existir em automações/backend de servidor ou no cofre operacional offline.

## Testes obrigatórios de papel

Execute em projeto de staging com dados fictícios antes de cada release:

1. **Anon:** selecionar uma nota privada, perfil não descobrível, convite e log de admin deve retornar zero linhas/erro; o Tabuleiro só pode retornar magnates com \`visivel_publico=true\`.
2. **Membro A:** só acessa suas notas e anexos; não acessa notas privadas do membro B nem notas de círculo sem adesão aceita; não consegue inserir/alterar registros administrativos.
3. **Membro de círculo:** depois de aceitar convite, consegue ver o círculo e suas notas colaborativas; um convite pendente não dá acesso ao conteúdo.
4. **Admin:** consegue revisar fila, emitir/revogar convites, ver logs de auditoria e moderar salas; notas pessoais continuam fora do dashboard de métricas.
5. **Storage:** downloads anônimos de \`notes-media\` falham; proprietário e colaborador autorizado têm apenas o acesso previsto pela nota.
6. **Controles negativos:** testar SELECT/INSERT/UPDATE/DELETE e chamadas RPC, não apenas a interface. Repetir após alterações de políticas.

Os testes devem usar sessões e JWTs reais para anon, membro e admin. Uma sessão SQL com privilégios de banco não é evidência suficiente de que a API respeita RLS.

## Avisos restantes

A auditoria do Supabase ainda reportou:
- extensão \`pg_trgm\` no schema \`public\`;
- funções \`SECURITY DEFINER\` expostas, incluindo endpoints intencionais da lista de espera e cancelamento da newsletter;
- proteção contra senhas vazadas desativada.

Não revogar em massa essas funções sem revisar seus chamadores: algumas são parte do fluxo público seguro, enquanto outras podem ser fechadas. Habilitar proteção contra senhas vazadas pelo painel/configuração Auth do Supabase quando o controle estiver disponível.

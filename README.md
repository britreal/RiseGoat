# RiseGoat

Aplicativo web de rede privada por convite, construído com React, TypeScript, Vite e Supabase.

## Produto ativo

A experiência pública é uma landing page. O acesso ao produto ocorre por solicitação de convite e aprovação manual. Após a aprovação, o membro entra por magic link enviado pelo Supabase Auth.

### Rotas

- `/` — apresentação da RiseGoat e solicitação de convite.
- `/auth` — login, lista de espera e recuperação de senha.
- `/notes` — notas pessoais, pastas, etiquetas, checklist, arquivos e Mapa privado.
- `/map` — conexões entre as próprias notas.
- `/network` — perfil opt-in, diretório de membros, círculos, salas, introduções e ferramentas administrativas.

## Funções atuais

- Notas pessoais com edição automática, pastas, etiquetas, cores, fixação, arquivo e lixeira.
- Checklist interativo, anexos em armazenamento privado, gravação de áudio e desenho.
- Importação do Google Takeout e lembretes locais estão desativados na interface.
- Compartilhamento de nota com permissão de edição ou somente leitura, convite por magic link e gestão de acesso.
- Exportação individual em JSON, Markdown e texto, impressão e backup completo com anexos.
- Mapa de ideias pessoal com criação e remoção manual de conexões.
- Perfil de membro com visibilidade por opt-in, pedido de introdução e solicitação de onboarding.
- Círculos privados (até 12 membros aceitos) com notas colaborativas separadas das notas pessoais.
- Salas temáticas com publicação sujeita à moderação.
- Notificações in-app de convites.
- Resumo coletivo de atividade apenas para membros que ativaram o opt-in e em círculos com pelo menos três membros aceitos.
- Modelos de pastas TEIA, ACESSO, ESCRITOR, CÍRCULO, DECISÃO e ATIVO.
- Dashboard administrativo para aprovar acesso, revisar introduções/onboarding, moderar salas e ver metadados de atividade sem conteúdo de notas pessoais.

## Segurança e privacidade

- Novos cadastros públicos são bloqueados no Supabase Auth; a entrada utiliza convite e lista de espera.
- Perfis não aparecem no diretório até que o membro ative a visibilidade.
- Notas pessoais nunca são copiadas automaticamente para círculos ou salas.
- Círculos e salas usam tabelas próprias e políticas RLS no banco de dados.
- As salas aceitam contribuições como rascunhos e exigem papel de administrador/moderador para publicação.
- A atividade coletiva é opcional e registra apenas eventos de checklist, sem títulos ou conteúdo.
- O acesso às notas compartilhadas respeita o papel definido no convite.

## Stack e verificações

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

As migrações do esquema de membros ficam em `supabase/migrations`. A implantação web é feita na Vercel e os dados/autenticação no Supabase.

> O envio de magic links depende da configuração de e-mail transacional do projeto Supabase Auth. Se o SMTP/provider não estiver configurado corretamente, o fluxo deve apresentar o erro em vez de usar o aplicativo de e-mail do dispositivo.

# Operação contínua da RiseGoat

Este documento descreve uma rotina operacional proposta. Os compromissos abaixo são tarefas de gestão, não automações concluídas nem eventos já confirmados.

## Semanal

- Revisar dez candidatos novos para o Tabuleiro.
- Para cada candidato, registrar fonte principal, fonte de biografia, setor, país, data de verificação e situação da curadoria.
- Revisar sugestões de Wikidata/SEC/OpenSecrets/ProPublica. Não transformar resultado de busca em vínculo verificado sem confirmar a fonte.
- Conferir convites pendentes da lista de espera e dar uma resposta manual, registrando o status.

## Mensal

- Revisar faixas de patrimônio e datas de referência nos perfis públicos.
- Conferir avisos de Supabase Security Advisor, RLS, storage e permissões de função.
- Conferir os últimos registros de \`maintenance_job_logs\` e entregas em \`transactional_email_events\`.
- Fazer backup do banco e verificar a restauração em ambiente separado.
- Rever membros com atividade estrutural recente e limpar somente metadados de que já não haja necessidade.

## Trimestral

- Revisar conexões do Tabuleiro, board interlocks e datas de vigência.
- Rever pertencimento aos círculos com seus responsáveis.
- Planejar um jantar presencial de oito pessoas: confirmar orçamento, cidade/local, data, lista de convidados e follow-up antes de assumir qualquer despesa.
- Medir se apresentações feitas pela equipe foram consentidas por ambas as partes e úteis.

## Onboarding por membro

Reserve uma conversa de 60 minutos para cada novo membro aprovado. Use o roteiro em \`docs/onboarding.md\`, registre no CRM privado apenas informação necessária e faça até três apresentações somente após consentimento dos envolvidos.

## Backup e restauração

- Agendar backup semanal do banco de dados no provedor e, quando anexos precisarem ser preservados, verificar também o armazenamento.
- Armazenar os backups criptografados fora do diretório público do aplicativo, com retenção e acesso limitados.
- Executar ao menos um teste de restauração em staging por trimestre.
- Não guardar \`service_role\`, tokens de API ou senha do cofre dentro de backup sem criptografia adicional.

## Evento presencial: checklist inicial

- [ ] Definir propósito e tamanho de oito pessoas.
- [ ] Escolher cidade e local após consultar disponibilidade.
- [ ] Definir data e custo máximo antes de convidar.
- [ ] Confirmar interesse individual e restrições dos convidados.
- [ ] Preparar agenda, regras de confidencialidade e apresentações.
- [ ] Registrar follow-up autorizado após o evento.

A RiseGoat ainda não possui um evento presencial confirmado. Local, data, custos e convidados devem ser definidos e aprovados separadamente pelo curador.

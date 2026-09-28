# Entrega — identificação territorial por post

Branch: `feature/territorial-post-detection`. Sem commit; `main` permanece em `d209c14b2dc64483f124212758a06917877aeb23`.

## Cadastro real

Campanha 1. Planilha mais recente encontrada em Downloads: `perfis_ras_df_lista_completa_com_metricas (1).xlsx`, modificada em 21/09/2026. Apesar de 896 linhas formatadas, contém 14 perfis preenchidos.

| Origem | Novos | Já existentes na primeira execução | Ativos | Inativos |
|---|---:|---:|---:|---:|
| Planilha territorial | 14 | 0 | 12 | 2 |
| Portais gerais | 11 | 0 | 11 | 0 |

Segunda execução: 25 encontrados, zero novos e zero duplicações. Os 18 perfis anteriores foram preservados, totalizando 43. Descrição, relevância e origem foram guardadas em `profile_monitoring`; `profile_type` legado não foi alterado.

| Perfil territorial | RA | Vínculo |
|---|---|---|
| @aguasclarasmidia | Águas Claras | Inativo conforme planilha |
| @dfaguasclaras | Águas Claras | Ativo |
| @arapoanganews | Arapoanga | Inativo conforme planilha |
| @ceilandia_alerta | Ceilândia | Ativo |
| @ceilandia.extraordinaria | Ceilândia | Ativo |
| @ceilandiaemassavei | Ceilândia | Ativo |
| @ceilandiamuitatreta | Ceilândia | Ativo |
| @diariodeceilandia | Ceilândia | Ativo |
| @jornaldoguara | Guará | Ativo |
| @guarahoje | Guará | Ativo |
| @movimentojb | Jardim Botânico | Ativo |
| @paranoanews | Paranoá | Ativo |
| @visitebrasilia | Plano Piloto | Ativo |
| @riachofundonews | Riacho Fundo | Ativo |

Portais gerais, todos ativos e sem RA fixa: @metropoles.df, @correio.braziliense, @jornaldebrasilia, @distritonews, @daquidebrasilia, @dicasdacapital, @brasilia.indica, @culturakidsbsb, @esporte.df, @gov_df, @sececdf.

As URLs foram normalizadas para `https://www.instagram.com/username/`; a importação não consultou Instagram/Apify para confirmar existência ou disponibilidade.

## Banco e migração

- `003_post_territories.sql`: cria `profile_monitoring`, `post_regions` e `scheduler_heartbeat`, com índices, FKs e restrições de fonte/confiança.
- `post_regions`: id, post_id, region_id nullable, source, confidence, evidence, created_at; várias RAs por post.
- Reutilizados `profile_regions`, `post_themes`, `sync_schedules`, `collection_runs` e `profile_collection_runs`.
- Migração aplicada no banco local e repetida duas vezes em schema PostgreSQL isolado para conferir idempotência. Nenhuma tabela histórica foi removida.

## Classificação real

Resultado final: **467 posts processados, 137 com RA, 330 sem RA e 28 RAs encontradas**.

| Confiança | Atribuições/candidatos |
|---|---:|
| HIGH | 159 |
| MEDIUM | 0 |
| LOW | 2 |

As contagens de confiança são por atribuição/candidato, não por post. Um post pode conter várias RAs. Os registros `NONE` não entram nessa contagem; LOW ambíguo permanece com `region_id=NULL`. Nenhuma localidade MEDIUM apareceu no conjunto real, embora a regra seja coberta nos testes.

| RA | Atribuições |
|---|---:|
| Arapoanga | 15 |
| Arniqueira | 19 |
| Brazlândia | 5 |
| Ceilândia | 7 |
| Cruzeiro | 1 |
| Fercal | 5 |
| Gama | 2 |
| Guará | 1 |
| Lago Norte | 1 |
| Lago Sul | 2 |
| Núcleo Bandeirante | 1 |
| Paranoá | 1 |
| Planaltina | 65 |
| Plano Piloto | 3 |
| Recanto das Emas | 1 |
| Riacho Fundo | 3 |
| SCIA/Estrutural | 2 |
| SIA | 3 |
| Samambaia | 2 |
| Santa Maria | 3 |
| Sobradinho | 6 |
| Sobradinho II | 1 |
| Sol Nascente/Pôr do Sol | 2 |
| São Sebastião | 1 |
| Taguatinga | 2 |
| Vicente Pires | 1 |
| Água Quente | 1 |
| Águas Claras | 3 |

| Tema existente | Posts |
|---|---:|
| Agro/Rural | 4 |
| Comunidade/Cotidiano | 16 |
| Educação | 10 |
| Emprego/Renda | 86 |
| Eventos/Cultura | 15 |
| Infraestrutura | 18 |
| Lazer | 11 |
| Meio Ambiente | 1 |
| Outros | 142 |
| Política | 139 |
| Saúde | 12 |
| Segurança | 10 |
| Transporte/Mobilidade | 3 |

## Exemplos reais do banco

Os temas abaixo são a saída real do classificador existente, não uma revisão humana. Legendas completas e links estão em `real-examples.json`.

### Post 37

Perfil: @claudioborcem_

Legenda:

Hoje estive com o meu amigo e chefe de gabinete @ismaeldfoficial na liderança do Podemos, no Senado Federal, protocolando um projeto que vai abrir novas portas para a juventude do Distrito Federal.

Planaltina, Ceilândia, Sobradinho e cada canto do nosso DF merecem ações reais e oportunidades de verdade. É assim que a gente transforma o potencial dos nossos jovens em realidade.

Juntos, nós Podemos! 🚀💥

Tema: Infraestrutura

Publicação: https://www.instagram.com/p/DZYgbYfOpFN/

- RA detectada: Sobradinho; confiança: HIGH; fonte: EXPLICIT_RA; evidência: “Planaltina, Ceilândia, Sobradinho”.
- RA detectada: Planaltina; confiança: HIGH; fonte: EXPLICIT_RA; evidência: “Planaltina”.
- RA detectada: Ceilândia; confiança: HIGH; fonte: EXPLICIT_RA; evidência: “Planaltina, Ceilândia”.

### Post 78

Perfil: @deputadoroberio

Legenda:

Parabéns, Planaltina, pelos seus 167 anos de uma cidade com muita história, tradição e progresso! 🎉

Entre 2022 e 2026, seguimos destinando emendas para infraestrutura, educação e cultura da região, que viabilizaram reformas em escolas, melhorias na iluminação pública, entre outros avanços. 

Além disso, o programa RenovaDF, que ajudamos a idealizar, revitalizou 100 equipamentos públicos na cidade, em espaços como o CAIC Assis Chateaubriand, o Parque Ecológico Sucupira e a Praça São Sebastião.

Parabéns a todos os moradores e moradoras de Planaltina! #VamosJuntos 2️⃣0️⃣0️⃣0️⃣0️⃣

#RobérioNegreiros #DeputadoDistirtal #MandatoParticipativo #Planaltina

Tema: Infraestrutura

Publicação: https://www.instagram.com/p/DcOqxSLkcQ-/

- RA detectada: Planaltina; confiança: HIGH; fonte: EXPLICIT_RA; evidência: “Parabéns, Planaltina”.

No post 78, a menção à **Praça São Sebastião** não atribui a RA homônima: é nome de equipamento público no contexto de Planaltina. Essa ambiguidade foi encontrada na revisão real e adicionada à regressão.

## Endpoints

| Método e caminho | Alteração |
|---|---|
| POST `/api/campaigns/{id}/profiles/import` | Novo: importação territorial JSON idempotente |
| POST `/api/campaigns/{id}/profiles/df-general` | Novo: cadastra os 11 portais |
| GET `/api/campaigns/{id}/trends/posts` | Novo: evidências paginadas e filtradas |
| POST `/api/campaigns/{id}/classify-posts` | RA e tema, escopo por campanha, relatório |
| GET `/api/campaigns/{id}/trends` | RA por post, agregação RA/tema, origem e filtros existentes |
| GET `/api/campaigns/{id}/analytics` | Filtro territorial por post e origem |
| GET `/api/campaigns/{id}/posts/{post_id}` | RA do perfil separada das RAs/evidências do post |
| GET `/api/campaigns/{id}` | Metadados editoriais e associação territorial |
| PUT `/api/profiles/{id}/region` | Impede RA fixa em portal geral |
| GET/POST `/api/campaigns/{id}/collections` | Estado do worker, horário real e execução manual com lock |
| GET `/api/sync/status` | Estado unificado do scheduler |

## Automação

`docker compose up -d --build` inicia PostgreSQL, backend e scheduler. API em modo external; serviço separado usa a mesma implementação de auto_sync. Um advisory lock elege um líder; outro por campanha impede coleta manual/automática simultânea. O lock usa conexão dedicada e sobrevive aos commits. PostgreSQL é obrigatório para a garantia entre processos; SQLite só fornece proteção local nos testes.

Configuração: `COLLECTION_ENABLED=true`, `COLLECTION_DAILY_TIME=03:00`, `COLLECTION_TIMEZONE=America/Sao_Paulo`, `COLLECTION_POST_LIMIT=25`. O modo legado por intervalo permanece disponível via `AUTO_SYNC_CAMPAIGN_IDS`. O horário diário perdido há mais de cinco minutos é pulado; o próximo dia é persistido. Não há coleta retroativa automática fora da janela.

O heartbeat é atualizado em thread separada durante coletas longas. Collections e o indicador de auto sync usam o mesmo estado real. A coleta manual continua disponível em “Executar agora”.

## Validação

- Backend: **56 testes aprovados**, incluindo suíte existente e regressões territoriais/agendamento.
- Navegador: **6 scripts aprovados**, incluindo o novo `territorial-smoke.mjs`; testes usam SQLite isolado, tokens vazios e scheduler desativado.
- PostgreSQL: **5 verificações aprovadas** — migração repetida, exclusão entre processos após commit, campanhas distintas, liberação normal e liberação após encerramento do processo.
- Frontend: build aprovado (2.415 módulos); aviso de bundle de 779,30 kB, gzip 228,27 kB.
- Lint: zero erros, seis avisos de Fast Refresh.
- Docker: imagens backend e scheduler compiladas; OpenAPI com 34 caminhos e consulta PostgreSQL validados dentro do container.
- Aviso existente de depreciação httpx/Starlette nos testes, sem falha.

## Ocorrência operacional durante o trabalho

Os testes e comandos de importação/classificação não acionam Apify. Entretanto, o backend nativo previamente aberto assumiu um agendamento diário vencido durante o trabalho e iniciou a coleta operacional nº 12. Ela foi interrompida para evitar consumo adicional. **Não é correto afirmar que não houve consumo real durante toda a sessão.**

A execução foi encerrada como PARTIAL: 4/27 perfis concluídos, 6 posts novos, 100 snapshots de posts e 4 snapshots de seguidores. Nenhum Actor ainda ativo correspondente foi encontrado na consulta de cancelamento. Os dados já coletados foram preservados.

Antes dessa execução, importação e classificação preservaram integralmente os 461 posts, 1.665 snapshots de posts e 64 snapshots de seguidores (`data-integrity.json`). Após a execução operacional: 467 posts, 1.765 snapshots de posts e 68 de seguidores. O relatório final de classificação inclui os seis posts adicionais.

O backend nativo e seu supervisor foram encerrados. A correção impede retomada tardia fora da janela diária, com teste específico. A próxima coleta persistida é 24/09/2026 às 03:00 em São Paulo (06:00 UTC).

Estado final confirmado pela API e pelo Compose: **PostgreSQL healthy, backend healthy e scheduler ativo**, com heartbeat recente e próxima coleta em 24/09 às 03:00. Nenhuma nova coleta começou ao subir o Docker; o total permaneceu em 467 posts e 12 execuções.

A verificação final não encontrou marcadores de conflito nem valores dos secrets locais nos arquivos versionados/candidatos. Duas referências preexistentes a credenciais foram removidas de `ATUALIZACOES.md` e `radar-eleitoral/README.md`. O histórico Git não foi reescrito. `.env` e `backend/.env` continuam ignorados, sem alterações staged e sem commit.

## Limitações

- Detecção por regras não é geocodificação universal: dicionário inicial limitado a localidades com associação documentada, sem inferir localidades desconhecidas.
- Brasília/DF não correspondem automaticamente a Plano Piloto. Homônimos ainda exigem revisão; confiança indica força da regra, não probabilidade estatística.
- Temas reutilizam palavras-chave existentes, que podem produzir rótulos imprecisos em contexto. Revisões manuais são preservadas.
- Posts com várias RAs contam uma vez por RA e uma vez no total de seu tema; somar as linhas territoriais pode superar o total de posts únicos.
- Classificação total inclui posts de perfis coletados como coautores; Trends respeita apenas os perfis ativos vinculados à campanha.
- Portais recém-cadastrados ainda dependem de futuras coletas para alimentar tendências; resultados apresentados são dos dados disponíveis.
- Publicações e snapshots anteriores foram preservados. Arquivos `.env` locais não devem ser versionados.

## Arquivos criados e modificados

Modificados (30):

- `.env.example`
- `ATUALIZACOES.md`
- `README.md`
- `backend/.env.example`
- `backend/app/models.py`
- `backend/app/routers/analytics.py`
- `backend/app/routers/campaigns.py`
- `backend/app/routers/collections.py`
- `backend/app/routers/filtered_analytics.py`
- `backend/app/routers/sync.py`
- `backend/app/routers/territorial.py`
- `backend/app/scheduler.py`
- `backend/app/services/auto_sync.py`
- `backend/app/services/instagram_sync.py`
- `backend/app/services/monitoring_sync.py`
- `backend/app/services/trends.py`
- `backend/requirements.txt`
- `backend/tests/serve_ui_fixture.py`
- `backend/tests/test_merge_integration.py`
- `docker-compose.yml`
- `radar-eleitoral/README.md`
- `src/components/dashboard/AutoSyncStatus.tsx`
- `src/components/dashboard/TerritorialFilters.tsx`
- `src/pages/Collections.tsx`
- `src/pages/Comparison.tsx`
- `src/pages/ContentDetail.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Trends.tsx`
- `src/services/api.ts`
- `src/types/api.ts`

Criados (25):

- `backend/.dockerignore`
- `backend/Dockerfile`
- `backend/app/config/territorial_aliases.json`
- `backend/app/services/collection_lock.py`
- `backend/app/services/profile_import.py`
- `backend/app/services/territorial_detection.py`
- `backend/app/territorial_cli.py`
- `backend/migrations/003_post_territories.sql`
- `backend/tests/check_territorial_postgres.py`
- `backend/tests/test_territorial_detection.py`
- `reports/territorial/IMPLEMENTATION.md`
- `reports/territorial/changed-files.json`
- `reports/territorial/classification-repeat.json`
- `reports/territorial/classification.json`
- `reports/territorial/data-integrity.json`
- `reports/territorial/final-validation.json`
- `reports/territorial/migration.json`
- `reports/territorial/operational-incident.json`
- `reports/territorial/postgres-validation.json`
- `reports/territorial/profile-import-repeat.json`
- `reports/territorial/profile-import.json`
- `reports/territorial/real-examples.json`
- `src/components/dashboard/TerritorialEvidence.tsx`
- `src/utils/territorial.ts`
- `tests/territorial-smoke.mjs`

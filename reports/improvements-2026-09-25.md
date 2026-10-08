Relatório da rodada de melhorias — Data Sight / Radar Eleitoral
Data: 25/09/2026
Branch: feature/territorial-post-detection

A implementação foi concluída na branch de desenvolvimento existente. A árvore já continha alterações locais e arquivos não rastreados antes desta rodada; essas alterações foram preservadas. Não houve commit, push, alteração da main, coleta Apify, chamada paga de IA, execução do scheduler real ou gravação no banco operacional. Dados sintéticos foram usados exclusivamente nas fixtures de teste isoladas.

1. Arquivos existentes modificados nesta rodada

| Área | Arquivos |
| --- | --- |
| Documentação/configuração | README.md; backend/.env.example; docker-compose.yml |
| Backend/API | backend/app/routers/analytics.py; backend/app/routers/filtered_analytics.py; backend/app/routers/territorial.py |
| Serviços | backend/app/services/auto_sync.py; backend/app/services/territorial_detection.py; backend/app/services/trends.py |
| Frontend | src/pages/Comparison.tsx; src/pages/Audience.tsx; src/pages/Trends.tsx; src/services/api.ts; src/types/api.ts |
| Testes existentes | backend/tests/check_mcp.py; backend/tests/check_territorial_postgres.py; backend/tests/serve_ui_fixture.py; backend/tests/test_merge_integration.py; backend/tests/test_territorial_detection.py; tests/merge-integration-smoke.mjs |
| Resultado de validação atualizado | reports/territorial/postgres-validation.json |

territorial_detection.py e alguns scripts de teste já existiam como arquivos não rastreados. Não foram criados originalmente nesta rodada. Outros arquivos exibidos por git status já estavam alterados antes do trabalho e não devem ser atribuídos a esta implementação.

2. Arquivos novos desta rodada

| Arquivo | Finalidade |
| --- | --- |
| src/components/comparison/DailyPerformanceChart.tsx | Gráfico reutilizável com seletor, total agregado e comparação de séries |
| backend/tests/test_competitor_daily.py | Seis testes de escopo, métricas, filtros, seguidores e proteção do scheduler |
| tests/competitor-daily-smoke.mjs | Regressão de navegador para concorrentes, métricas, tooltips e audiência |
| reports/improvements-2026-09-25.md | Este relatório |

Builds, screenshots e caches de teste permanecem nas saídas locais já usadas pelo projeto; não foram adicionados como código-fonte.

3. Backend

A análise filtrada aceita escopo por papel do vínculo da campanha e diferencia seleção vazia de seleção geral. Datas inválidas ou invertidas retornam HTTP 422. As oito métricas diárias são calculadas sobre posts únicos; múltiplas RAs não multiplicam o total global. O último snapshot é escolhido no banco por data de coleta e ID, usando uma consulta com row_number, sem carregar todo o histórico de snapshots para a comparação.

Métricas sem valores permanecem null; zero armazenado permanece zero. metric_samples informa quantos posts contribuíram para cada soma. O histórico de seguidores e o fallback territorial passaram a carregar registros em lote, reduzindo consultas por perfil/post.

4. Frontend

A implementação foi feita no frontend integrado da raiz, src/. O frontend anterior em radar-eleitoral/ foi inspecionado para localizar o gráfico anterior e permaneceu preservado. Foram reutilizados Recharts, AnalysisCard, filtros e componentes visuais existentes. A comparação possui estados de carregamento, erro e vazio; respostas atrasadas de uma campanha/filtro anterior são descartadas.

5. Banco e migrations

Nenhuma nova tabela, coluna ou migração foi necessária. Nenhum dado operacional foi apagado, atualizado ou reclassificado. A migração aditiva existente 003_post_territories.sql foi executada duas vezes somente em PostgreSQL descartável para confirmar idempotência. O script PostgreSQL agora exige TEST_DATABASE_URL e não usa implicitamente backend/.env.

Os quatro perfis de Planaltina e a rotina de importação existente foram preservados. Os testes confirmam cadastro idempotente, vínculo ativo LOCAL_PAGE, associação a Planaltina e preservação de histórico. Não foi feito seed/importação real nesta rodada.

6. Endpoints

Nenhum endpoint duplicado ou novo foi criado. GET /api/campaigns/{campaign_id}/analytics recebeu role e profile_selection opcionais. A página Concorrentes envia role=COMPETITOR e profile_selection=selected. IDs enviados são intersectados com os vínculos ativos desse papel; IDs de LOCAL_PAGE, MEDIA, DF_GENERAL ou CLIENT não entram no resultado dessa página.

profile_selection=selected sem IDs retorna seleção vazia. Consumidores que não pedem esse escopo mantêm o comportamento anterior. daily mantém posts/interactions e acrescenta likes, comments, views, plays, shares, saves e metric_samples, tanto no total quanto por perfil. Interações totalmente ausentes agora são null.

Tendências mantêm seus endpoints e acrescentam interactions_posts para informar cobertura. Os endpoints de auditoria, seguidores, conteúdos, coleta e IA foram preservados.

7. Página Concorrentes

A seleção mostra exclusivamente concorrentes ativos conforme CampaignProfile.role. Não usa username, nome ou profile_type legado para inferir concorrência. Período, RA, tema, formato, origem territorial e perfis filtram o mesmo conjunto no backend. O botão Todos os perfis restaura a seleção dos concorrentes ativos. Desmarcar todos retorna vazio. Ranking, formatos, temas, totais e tabela detalhada foram preservados dentro desse escopo.

8. Desempenho por dia

Um componente controlado apresenta título Desempenho por dia e subtítulo Como varia o desempenho das publicações?. O seletor altera a série sem nova requisição por métrica. Há eixo de data, eixo numérico, ordem cronológica, pontos, tooltip e legenda. A seleção da métrica e o modo de comparação permanecem ao trocar filtros.

Por padrão, a série agrega todos os concorrentes selecionados. Comparar perfis mostra séries individuais, mantendo o limite visual existente de cinco perfis e seu aviso. Os totais incluem todos os selecionados. A ausência de métrica aparece como indisponível; dias sem posts armazenados não recebem valores artificiais.

O agrupamento usa a data de publicação em UTC e o último snapshot armazenado de cada post. Portanto, é desempenho observado dos posts publicados em cada dia, não incremento de interações recebido naquele dia. Posts sem data de publicação ficam fora do recorte temporal; nenhuma data é estimada a partir do perfil.

9. Métricas disponíveis

Interações, Curtidas, Comentários, Visualizações, Reproduções, Compartilhamentos, Salvamentos e Publicações. Publicações conta posts; as demais somam os valores armazenados. Métricas parciais exibem aviso de cobertura. Compartilhamentos e salvamentos permanecem indisponíveis se a coleta não os fornecer.

10. Audiência

O histórico continua usando ProfileSnapshot real. O gráfico agora oferece Todos os perfis ou um perfil específico, com uma série por perfil, legenda, tooltip e datas ordenadas. Não há preenchimento de lacunas ou reconstrução por seguidores atuais. A troca de campanha não mantém um perfil inválido selecionado. A consulta mantém a última coleta de cada dia, com desempate por ID.

11. Tendências

Perfis territoriais e portais DF geral continuam alimentando Tendências; a regra exclusiva de concorrentes não foi aplicada aqui. Foram mantidos volume, crescimento, formatos, perfis, origens e links de evidência. A média de interações considera somente posts com essa métrica disponível; ausência completa aparece como N/D. A tabela informa a cobertura da métrica no tooltip. O score multifatorial existente foi preservado; não equivale apenas a quantidade de posts.

12. Inteligência territorial e auditoria

A identificação por conteúdo/localização e a persistência das evidências foram preservadas. Foram acrescentados reconhecimento de hashtags geográficas compostas e menções geográficas exatas, incluindo #RiachoFundoII, #Sobradinho_II e @planaltina. Usernames como @planaltinanews não são usados para inferir RA.

O exemplo Parabéns, Planaltina, pelos seus 167 anos registra a evidência literal Parabéns, Planaltina. Múltiplas RAs, distinção entre RA do perfil e RA do conteúdo, níveis HIGH/MEDIUM/LOW, casos ambíguos e posts sem RA continuam cobertos pelos testes. O fallback de perfil mantém LOW e não se aplica a DF_GENERAL. A auditoria não reclassifica durante consultas.

Temas, formatos, dias/horários, conteúdos, thumbnails, detalhes e IA opcional foram preservados e verificados nas suítes existentes. Relatórios HTML agora também mostram N/D para interações ausentes.

13. Scheduler e coleta

APP_ENV=development é o padrão e impede iniciar o worker ou executar o coletor real pelo tick, mesmo que uma configuração antiga tenha COLLECTION_ENABLED=true e modo embedded. Testes exercitam agendamento com coletores simulados; nenhum worker real foi iniciado.

Produção usa APP_ENV=production. Os serviços operacionais no docker-compose.yml declaram esse valor. Permanecem COLLECTION_DAILY_TIME=03:00, COLLECTION_TIMEZONE=America/Sao_Paulo, COLLECTION_POST_LIMIT, compatibilidade de intervalo, locks, histórico e proteção contra retomada diária fora da janela. Em execução nativa de produção, é necessário configurar APP_ENV=production explicitamente.

A página Coletas e seus indicadores existentes foram preservados. A API fixture permaneceu sem token, sem scheduler e com status inativo. Nenhuma implantação foi realizada e nenhuma configuração secreta local foi editada.

14. Testes executados

| Validação | Execução |
| --- | --- |
| Backend completo | python -m unittest discover -s backend/tests -p test_*.py |
| Novo navegador | node tests/competitor-daily-smoke.mjs |
| Navegador existente | merge-integration-smoke, territorial-smoke, ui-smoke, navigation-smoke, latest-post-smoke, post-detail-ai-smoke, territorial-audit-report-smoke |
| PostgreSQL | backend/tests/check_territorial_postgres.py em instância descartável |
| MCP | backend/tests/check_mcp.py contra a API fixture |
| Build | npm run build |
| Lint | npm run lint |
| API | GET /docs e GET /openapi.json na API fixture |
| Integridade | git diff --check |

As variáveis de teste mantiveram tokens vazios, APP_ENV=test e COLLECTION_SCHEDULER_MODE=disabled. Testes de integração que simulam produção mockam os provedores e a inicialização do scheduler. O PostgreSQL de validação usou armazenamento temporário em memória e porta exclusiva; os serviços operacionais não foram alterados.

15. Resultado dos testes

80 testes backend aprovados, incluindo nove casos novos nesta rodada. Oito scripts de navegador aprovados. A regressão adicional verificou também tooltips com 21 curtidas, 4 comentários e 0 compartilhamentos na fixture, salvamentos indisponíveis, manutenção da métrica ao trocar perfis e exclusão de perfis territoriais.

Seis verificações PostgreSQL aprovadas: último snapshot e papel na agregação diária; migração aplicada duas vezes; lock entre processos após commit; campanhas distintas em paralelo; liberação do lock; liberação após encerramento de processo. Resultado em reports/territorial/postgres-validation.json.

MCP aprovado: handshake, seis ferramentas de leitura, consulta de dados da fixture, filtro semanal e isolamento entre campanhas. As duas falhas da primeira execução backend foram corrigidas nos testes: omissão de parâmetro opcional versus string vazia e declaração explícita do ambiente de produção simulado. A suíte completa final passou.

16. Build

Aprovado: TypeScript e Vite, 2.416 módulos. Bundle principal final de aproximadamente 782 kB, 229 kB gzip. Artefatos gerados localmente em dist/.

17. Lint

Aprovado, sem erros. Permanecem seis avisos de react(only-export-components), em authContext, toast e TerritorialFilters nos frontends integrado e anterior. git diff --check passou.

18. OpenAPI

/docs retornou HTTP 200. /openapi.json foi carregado corretamente, OpenAPI 3.1.0, com 36 caminhos. O endpoint analytics documenta role e profile_selection. A API isolada iniciou sem erro de importação.

19. Warnings restantes

Aviso do Vite sobre chunk acima de 500 kB; seis avisos de Fast Refresh citados acima; depreciação Starlette/httpx no TestClient; aviso Git de normalização LF/CRLF em backend/app/models.py, arquivo que já estava alterado antes desta rodada. Uma primeira execução de build também sinalizou tempo de plugins, sem falha. A mensagem Scheduled collection failed for campaign 1 (RuntimeError) corresponde ao teste negativo com coletor simulado e é esperada.

20. Limites e operação posterior

Nenhum requisito funcional desta rodada ficou bloqueado. Não foram executadas coleta real, chamada real de IA, reclassificação/importação em produção, migração no banco operacional ou implantação. Portanto, disponibilidade e preenchimento de métricas pelos provedores reais não foram validados; a aplicação exibe os valores existentes e preserva ausência como ausência.

O limite visual de cinco séries na comparação e o agrupamento diário UTC foram mantidos/documentados. A pasta do frontend anterior não recebeu uma segunda implementação das melhorias. O código e o relatório ficam para revisão na branch atual, sem commit e sem push.

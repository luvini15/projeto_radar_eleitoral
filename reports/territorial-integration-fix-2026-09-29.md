Correção e integração territorial — 29/09/2026
Branch: feature/territorial-post-detection

O erro em /concorrentes foi corrigido, a integração territorial foi completada e o backend local da porta 8000 foi atualizado. Nenhum commit, push, coleta Apify ou scheduler real foi executado. Não houve alteração de schema ou migração nova.

Problemas encontrados e correções

1. DailyPerformanceChart acessava day.metric_samples[metric] sem verificar se metric_samples existia. Também assumia daily e day.profiles sempre presentes. A tipagem descrevia uma resposta completa, embora o servidor em execução pudesse enviar respostas parciais.

Foi criada uma normalização tipada na entrada do gráfico. Coleções ausentes/inválidas tornam-se uma lista vazia; dias sem data válida são descartados; dias com data e sem métricas mantêm valores null; mapas de perfis ausentes tornam-se mapas vazios. Métricas e cobertura ausentes permanecem null, sem conversão artificial para zero. Zero numérico real é preservado; NaN, Infinity, números negativos e strings não são enviados ao gráfico como métricas. Não são inventados totais ou datas a partir dos perfis. A comparação considera a disponibilidade das séries individuais, mesmo quando falta o total do dia. Cobertura desconhecida recebe uma mensagem específica.

2. A API em execução na porta 8000 vinha de uma imagem Docker antiga. O OpenAPI dessa instância não declarava role nem profile_selection, embora o código da branch já implementasse ambos. Essa divergência também poderia fazer uma seleção vazia retornar perfis que não eram concorrentes.

A integração agora confirma o escopo retornado pela API e exibe erro explicativo se o backend não o suportar, em vez de apresentar totais de grupos misturados. A imagem backend foi reconstruída e somente esse serviço foi recriado com docker compose up -d --no-deps backend. Antes da atualização, foi verificado COLLECTION_SCHEDULER_MODE=external. O PostgreSQL não foi reiniciado e o serviço scheduler não foi iniciado. O backend atualizado ficou healthy e passou na validação de leitura das páginas reais.

3. Tendências somava todos os papéis sem um recorte explícito de grupo. Foi acrescentado profile_group aos endpoints existentes de tendências, evidências e inteligência. A consulta intersecta IDs selecionados com vínculos ativos do grupo no banco:

| Grupo | Papéis |
| --- | --- |
| Monitoramento territorial e portais | LOCAL_PAGE, MEDIA, DF_GENERAL |
| Concorrentes políticos | COMPETITOR |
| Perfil da campanha | CLIENT |

O padrão da página Tendências é territorial. O seletor de perfis acompanha o grupo e a seleção de IDs é limpa ao trocar grupo/campanha. Agregação e drilldown usam o mesmo grupo. A API preserva ALL como padrão para consumidores anteriores, mas as páginas atualizadas solicitam e validam seu grupo explicitamente.

4. Inteligência territorial recebia evidências do backend, mas exibia apenas links. Agora reutiliza TerritorialEvidence para mostrar RA, fonte, confiança e evidência literal, com links para os detalhes da publicação. A seção RAs e temas identificados apresenta os recortes territoriais mesmo quando não há alertas acima dos limiares. Essa página usa os perfis territoriais e portais. A identificação por legenda continua no classificador existente, já usado pelos fluxos de coleta/classificação e coberto pelos testes.

Auditoria das conexões

| Rota e sidebar | Página | Integração confirmada |
| --- | --- | --- |
| /concorrentes — Concorrentes | Comparison | getCampaign filtra vínculos COMPETITOR ativos; getFilteredAnalytics envia role=COMPETITOR e profile_selection=selected; DailyPerformanceChart é importado e renderizado |
| /tendencias — Tendências | Trends | TerritorialFilters, getTrends, getTrendPosts e TerritorialEvidence; grupo, RA, tema, formato, origem e evidências conectados |
| /insights — Inteligência territorial | TerritorialIntelligence | getIntelligence com grupo territorial, RAs/temas, TerritorialEvidence e links de publicação |
| /conteudos/:postId | ContentDetail | TerritorialEvidence já estava renderizado e separa RA do perfil da RA da publicação |

App.tsx e Sidebar.tsx já apontavam para as páginas corretas e não precisaram ser alterados. DailyPerformanceChart já estava montado; o problema era seu contrato de entrada. TerritorialEvidence estava em Tendências e detalhes, mas faltava na Inteligência territorial.

Foram identificados componentes visuais antigos sem importação nas páginas ativas, incluindo src/components/charts/*, AlertList, ExecutiveSummary, os componentes de src/components/insights e MediaTable/MediaDetailPanel. As páginas integradas usam seus próprios gráficos e tabelas com dados de API; esses componentes antigos não são implementações territoriais pendentes. Permaneceram preservados. LoginAnimatedBackdrop usa importação dinâmica e está ativo. O frontend anterior em radar-eleitoral/ continua separado do frontend integrado src/.

Contrato analytics

O backend da branch já entregava todas as métricas esperadas. Os testes foram ampliados para confirmar:

- daily vazio quando o filtro não encontra posts;
- posts conta publicações armazenadas;
- likes, comments, views, plays, interactions, shares e saves são null quando ausentes;
- zero real é mantido;
- metric_samples contém contagens, inclusive zero quando nenhum snapshot fornece a métrica;
- o mesmo contrato existe por perfil;
- vínculos fora de COMPETITOR ficam excluídos do recorte da comparação.

Arquivos alterados

| Arquivo | Alteração |
| --- | --- |
| src/components/comparison/DailyPerformanceChart.tsx | Normalização, disponibilidade de séries, cobertura desconhecida e tooltip defensivo |
| src/types/api.ts | Tipos de entrada diária parcial, totais normalizados, grupos e confirmação dos filtros |
| src/services/api.ts | Propagação dos grupos e validação de compatibilidade/escopo |
| src/components/dashboard/TerritorialFilters.tsx | Seletor de grupo |
| src/pages/Comparison.tsx | Exibição do erro de contrato desatualizado |
| src/pages/Trends.tsx | Grupos separados, lista de perfis correspondente e estado de carregamento |
| src/pages/TerritorialIntelligence.tsx | RAs, temas, evidências renderizadas e proteção contra respostas atrasadas |
| backend/app/services/trends.py | Recorte por papel ativo no banco |
| backend/app/routers/territorial.py | profile_group nos endpoints existentes e no drilldown |
| backend/tests/test_competitor_daily.py | Regressões do contrato diário e grupos/evidências/inteligência |
| tests/territorial-smoke.mjs | Seleção explícita do grupo CLIENT para preservar a finalidade da fixture existente |

Arquivos novos

- src/utils/dailyAnalytics.ts: validação e normalização dos dados diários recebidos.
- tests/daily-analytics.test.mjs: seis testes da fronteira de dados incompletos/inválidos.
- tests/territorial-integration-smoke.mjs: regressão visual das respostas parciais, grupos e evidências.
- reports/territorial-integration-fix-2026-09-29.md: este relatório.

Validações executadas

| Verificação | Resultado |
| --- | --- |
| python -m unittest discover -s backend/tests -p test_*.py | 82 testes aprovados; SQLite isolado, sem coleta real |
| node --test tests/daily-analytics.test.mjs | 6 testes aprovados |
| node node_modules/typescript/bin/tsc -b --pretty false | Aprovado |
| npm run build | Aprovado; 2.417 módulos |
| npm run lint | Sem erros; 6 avisos de Fast Refresh existentes |
| tests/territorial-integration-smoke.mjs | Aprovado: daily ausente/null/vazio, dias sem métricas, perfis incompletos, oito métricas, total ausente com série existente, API antiga, grupos e evidências |
| tests/competitor-daily-smoke.mjs | Aprovado |
| tests/territorial-smoke.mjs | Aprovado |
| tests/merge-integration-smoke.mjs | Aprovado |
| Navegador com API local atualizada, somente GET | /concorrentes, /tendencias e /insights aprovadas sem exceções ou alertas de erro |
| /docs e /openapi.json na porta 8000 | HTTP 200; parâmetros novos presentes |
| git diff --check | Aprovado |

Warnings não bloqueantes: bundle principal acima de 500 kB (aproximadamente 786 kB, 230 kB gzip), seis avisos react(only-export-components) e depreciação Starlette/httpx no TestClient. A mensagem de falha de coleta exibida na suíte vem de um teste negativo com coletor simulado.

Os servidores temporários de teste foram encerrados. O backend local atualizado permanece em execução na porta 8000, com scheduler external. O banco operacional foi preservado; não foram executadas importação, reclassificação ou coleta real. A inicialização usa as rotinas aditivas/idempotentes já existentes no projeto. As alterações permanecem sem commit na branch solicitada.
